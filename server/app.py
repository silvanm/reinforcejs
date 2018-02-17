from time import strftime
from flask import Flask, request
from flask_cors import CORS

app = Flask(__name__)
cors = CORS(app)

@app.route("/braindump/<id>", methods=['POST'])
def braindump(id):
    content = request.data
    filename = f"brains/brain-{id}-{strftime('%Y-%m-%d_%H-%M')}.json"
    with open(filename, 'wb') as f:
        f.write(content)

    return "OK"