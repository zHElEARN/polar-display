import asyncio
import websockets
import threading
import signal
import json
import os
import webbrowser
import numpy

from typing import Union
from aiohttp import web
from bleak import BleakScanner
from rich.console import Console
from rich import inspect
from datetime import datetime
from polar_python import (
    PolarDevice,
    MeasurementSettings,
    SettingType,
    ECGData,
    ACCData,
    HRData,
)
from dataclasses import asdict

connected_clients = set()
console = Console()
exit_event = threading.Event()

async def handle(request):
    filename = request.match_info.get('filename', 'index.html')
    if filename == '' or filename == 'favicon.ico':
        filename = 'index.html'
    file_path = os.path.join('./web', filename)
    if os.path.exists(file_path) and os.path.isfile(file_path):
        return web.FileResponse(file_path)
    else:
        raise web.HTTPNotFound()

async def web_main():
    app = web.Application()
    app.router.add_get('/{filename:.*}', handle)
    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, '0.0.0.0', 8766)
    await site.start()
    webbrowser.open("http://localhost:8766")


def handle_exit(signum, frame):
    console.print("[bold red]Received exit signal[/bold red]")
    exit_event.set()


async def handle_client(websocket):
    connected_clients.add(websocket)
    try:
        async for message in websocket:
            print(f"Received message from client: {message}")
    except websockets.exceptions.ConnectionClosed as e:
        print(f"Client disconnected: {e}")
    finally:
        connected_clients.remove(websocket)


async def broadcast_message(message):
    if connected_clients:
        await asyncio.gather(*[client.send(message) for client in connected_clients])


async def socket_main():
    async with websockets.serve(handle_client, "localhost", 8765):
        while not exit_event.is_set():
            await asyncio.sleep(1)


async def polar_main():
    device = await BleakScanner.find_device_by_filter(
        lambda bd, ad: bd.name and "Polar H10" in bd.name, timeout=5
    )
    if device is None:
        console.print("[bold red]Device not found[/bold red]")
        return

    inspect(device)

    ecg_data = []

    def heartrate_callback(data: HRData):
        console.print(f"[bold green]Received Data:[/bold green] {data}")
        loop = asyncio.get_event_loop()
        loop.create_task(
            broadcast_message(json.dumps({"type": "heartrate", "data": asdict(data)}))
        )

    def data_callback(data: Union[ECGData, ACCData]):
        console.print(f"[bold green]Received Data:[/bold green] {data}")
        loop = asyncio.get_event_loop()
        loop.create_task(
            broadcast_message(json.dumps({"type": "ecg" if isinstance(data, ECGData) else "acc", "data": asdict(data)}))
        )
        if isinstance(data, ECGData):
            ecg_data.extend(data.data)

    async with PolarDevice(device, data_callback, heartrate_callback) as polar_device:
        ecg_settings = MeasurementSettings(
            measurement_type="ECG",
            settings=[
                SettingType(type="SAMPLE_RATE", array_length=1, values=[130]),
                SettingType(type="RESOLUTION", array_length=1, values=[14]),
            ],
        )

        acc_settings = MeasurementSettings(
            measurement_type="ACC",
            settings=[
                SettingType(type="SAMPLE_RATE", array_length=1, values=[25]),
                SettingType(type="RESOLUTION", array_length=1, values=[16]),
                SettingType(type="RANGE", array_length=1, values=[2]),
            ],
        )

        await polar_device.start_stream(ecg_settings)
        await polar_device.start_stream(acc_settings)

        await polar_device.start_heartrate_stream()

        while not exit_event.is_set():
            await asyncio.sleep(1)

        if not os.path.exists("logs"):
            os.makedirs("logs")
        numpy.save(f"logs/{datetime.now().strftime("%Y%m%d-%H%M%S")}", ecg_data)


async def run():
    signal.signal(signal.SIGINT, handle_exit)
    signal.signal(signal.SIGTERM, handle_exit)
    await asyncio.gather(socket_main(), polar_main(), web_main())


if __name__ == "__main__":
    asyncio.run(run())
