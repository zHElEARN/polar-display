# polar-display

**polar-display** is a Python program that reads data from a Polar H10 heart rate sensor, broadcasts the data via WebSocket, and displays it on a webpage as ECG and ACC charts. This program uses the [polar-python](https://github.com/zHElEARN/polar-python) library to interact with the Polar H10 device.

## Prerequisites

-   Python 3.6+
-   Polar H10 heart rate sensor

## Installation

1. Clone the repository:

    ```bash
    git clone https://github.com/zHElEARN/polar-display.git
    cd polar-display
    ```

2. Install the `polar-python` library:

    ```bash
    pip install polar-python
    ```

## Usage

1. Ensure your Polar H10 device is on and nearby.

2. Run the server:

    ```bash
    python server.py
    ```

3. Open your web browser and navigate to `http://localhost:8080` to see the real-time ECG and ACC charts.

## License

This project is licensed under the MIT License. See the LICENSE file for details.

## Acknowledgements

-   [polar-python](https://pypi.org/project/polar-python/): Library for interacting with Polar H10 devices
