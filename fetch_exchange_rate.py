import requests
import os
import sys

def get_usd_jpy_rate():
    #api_key = os.getenv("EXCHANGE_RATE_API_KEY")  # 環境変数からAPIキーを取得
    api_key = "ac64dbca86060f472a1f827d"

    if not api_key:
        print("APIキーが設定されていません。", file=sys.stderr)
        sys.exit(1)

    url = f"https://v6.exchangerate-api.com/v6/{api_key}/latest/USD"

    try:
        response = requests.get(url)
        response.raise_for_status()
        data = response.json()

        if data.get('result') == 'success' and 'JPY' in data['conversion_rates']:
            rate = data['conversion_rates']['JPY']
            print(rate)  # 為替レートを数値のみで出力
        else:
            error_type = data.get('error-type', '不明なエラー')
            print(f"APIエラー: {error_type}", file=sys.stderr)
            sys.exit(1)
    except requests.exceptions.RequestException as e:
        print(f"HTTPリクエストエラー: {e}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"為替データの取得に失敗しました: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    get_usd_jpy_rate()
