from flask import Flask, jsonify
import pandas as pd

app = Flask(__name__)
df = pd.read_csv("stock_data.csv")

@app.route("/api/data/<company>")
def get_data(company):
    company_data = df[df['Company'] == company]
    return jsonify(company_data.to_dict(orient="records"))

if __name__ == "__main__":
    app.run(debug=True)
