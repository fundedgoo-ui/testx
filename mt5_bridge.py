import MetaTrader5 as mt5
from flask import Flask, request, jsonify
import logging

# Configuration
# Change this token and use it in your Web Platform Admin settings!
API_TOKEN = "YOUR_SECURE_TOKEN_HERE" 

app = Flask(__name__)

# Setup Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def initialize_mt5():
    if not mt5.initialize():
        logging.error(f"MT5 initialization failed, error code: {mt5.last_error()}")
        return False
    logging.info("MT5 initialized successfully")
    return True

@app.route('/place_trade', methods=['POST'])
def place_trade():
    # Security Check
    token = request.headers.get('Authorization')
    if token != f"Bearer {API_TOKEN}":
        return jsonify({"success": False, "message": "Unauthorized"}), 401

    data = request.json
    symbol = data.get('symbol')
    order_type = data.get('type')  # "BUY" or "SELL"
    volume = float(data.get('volume', 0.01))
    sl = float(data.get('sl', 0))
    tp = float(data.get('tp', 0))
    
    if not symbol:
        return jsonify({"success": False, "message": "Missing symbol"}), 400

    # Get Current Price
    tick = mt5.symbol_info_tick(symbol)
    if tick is None:
        return jsonify({"success": False, "message": f"Failed to get price for {symbol}"}), 400
        
    price = tick.ask if order_type == "BUY" else tick.bid
    mt5_type = mt5.ORDER_TYPE_BUY if order_type == "BUY" else mt5.ORDER_TYPE_SELL
    
    # Prepare Request
    request_dict = {
        "action": mt5.TRADE_ACTION_DEAL,
        "symbol": symbol,
        "volume": volume,
        "type": mt5_type,
        "price": price,
        "sl": sl,
        "tp": tp,
        "deviation": 20,
        "magic": 123456,
        "comment": "Web Platform Bridge",
        "type_time": mt5.ORDER_TIME_GTC,
        "type_filling": mt5.ORDER_FILLING_IOC,
    }
    
    # Send Order
    result = mt5.order_send(request_dict)
    
    if result.retcode != mt5.TRADE_RETCODE_DONE:
        logging.error(f"Order failed: {result.comment} (code: {result.retcode})")
        return jsonify({
            "success": False, 
            "message": result.comment,
            "code": result.retcode
        }), 400

    logging.info(f"Order successful for {symbol}: Trade ID {result.order}")
    return jsonify({
        "success": True,
        "order_id": result.order,
        "message": "Order placed successfully"
    })

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "running", "mt5_connected": True})

if __name__ == '__main__':
    if initialize_mt5():
        print("-" * 50)
        print("MT5 BRIDGE IS RUNNING")
        print(f"API Token: {API_TOKEN}")
        print("Listening on http://0.0.0.0:5000")
        print("-" * 50)
        app.run(host='0.0.0.0', port=5000)
    else:
        print("Could not start MT5 bridge. Make sure MT5 terminal is open.")
