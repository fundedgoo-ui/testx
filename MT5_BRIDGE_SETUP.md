# MetaTrader 5 VPS Bridge Setup Guide

To connect your web platform to a real MetaTrader 5 account running on a VPS, follow these steps exactly.

## 1. Prepare your VPS
- Recommended: **Windows VPS** (MT5 runs natively on Windows).
- Install **MetaTrader 5** and login with your real account.
- **IMPORTANT**: Keep the terminal open 24/7 or use a task scheduler to restart it on boot.

## 2. Install Python Environment
On your VPS, install Python 3.8 or higher. Then install the required libraries:
```bash
pip install MetaTrader5 Flask flask-cors
```

## 3. Create the Bridge Script (`bridge.py`)
Create a file named `bridge.py` and paste the following code. This script includes security checks and the positions endpoint required for synchronization.

```python
from flask import Flask, request, jsonify
from flask_cors import CORS
import MetaTrader5 as mt5
import os

app = Flask(__name__)
CORS(app)

# --- CONFIGURATION ---
# Set the same secret as your MT5_BRIDGE_SECRET in .env
BRIDGE_TOKEN = "YOUR_SECURE_TOKEN_HERE" 

# Conectare la MT5 la pornire
if not mt5.initialize():
    print("Eroare conectare MT5. Ensure MT5 terminal is open.")
    quit()

def check_auth():
    token = request.headers.get('X-Bridge-Token')
    if token != BRIDGE_TOKEN:
        return False
    return True

@app.route('/place_trade', methods=['POST'])
def place_trade():
    if not check_auth():
        return jsonify({"success": False, "message": "Unauthorized"}), 401

    data = request.json
    symbol = data['symbol']
    order_type = data['type']  # "BUY" sau "SELL"
    volume = float(data['volume'])
    sl = float(data.get('sl', 0))
    tp = float(data.get('tp', 0))
    
    # Check if symbol exists
    symbol_info = mt5.symbol_info(symbol)
    if symbol_info is None:
        return jsonify({"success": False, "message": f"Symbol {symbol} not found"}), 404

    price = mt5.symbol_info_tick(symbol).ask if order_type == "BUY" else mt5.symbol_info_tick(symbol).bid
    
    request_dict = {
        "action": mt5.TRADE_ACTION_DEAL,
        "symbol": symbol,
        "volume": volume,
        "type": mt5.ORDER_TYPE_BUY if order_type == "BUY" else mt5.ORDER_TYPE_SELL,
        "price": price,
        "sl": sl,
        "tp": tp,
        "deviation": 30,
        "magic": 987654,
        "comment": "From Web Platform",
        "type_time": mt5.ORDER_TIME_GTC,
        "type_filling": mt5.ORDER_FILLING_IOC,
    }
    
    result = mt5.order_send(request_dict)
    
    return jsonify({
        "success": result.retcode == 10009,
        "order_id": result.order if result.retcode == 10009 else None,
        "message": result.comment,
        "retcode": result.retcode
    })

@app.route('/get_positions', methods=['GET'])
def get_positions():
    if not check_auth():
        return jsonify({"success": False, "message": "Unauthorized"}), 401

    positions = mt5.positions_get()
    if positions is None:
        return jsonify([])

    result = []
    for p in positions:
        result.append({
            "id": str(p.ticket),
            "symbol": p.symbol,
            "type": "buy" if p.type == 0 else "sell",
            "lots": p.volume,
            "open_price": p.price_open,
            "sl": p.sl,
            "tp": p.tp,
            "open_time": p.time * 1000, # ms
            "pnl": p.profit
        })
    
    return jsonify(result)

if __name__ == '__main__':
    # Use port 5000 and allow external access
    app.run(host='0.0.0.0', port=5000)
```

## 4. Run the Bridge
Start the script:
```bash
python bridge.py
```

## 5. Configure your Web App
1. Go to the **Settings** menu of your AI Studio application.
2. Set `MT5_BRIDGE_URL` to `http://YOUR_VPS_IP:5000`.
3. Set `MT5_BRIDGE_SECRET` to the same token you set in `bridge.py`.

## 6. Security Note
- Use a strong, long token for `MT5_BRIDGE_SECRET`.
- Configure your VPS Firewall to only allow incoming traffic on port 5000 from the Web App's IP if possible.
