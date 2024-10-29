import requests
from bs4 import BeautifulSoup

def get_usd_jpy_rate():
    url = "https://finance.yahoo.com/quote/USDJPY=X"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36"
    }

    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()

        soup = BeautifulSoup(response.text, "html.parser")
        price_span = soup.find("fin-streamer", {"data-symbol": "USDJPY=X", "data-field": "regularMarketPrice"})

        if price_span and price_span.text:
            price = price_span.text.strip()
            return price  # レートのみを返す
        else:
            return None  # データが取得できなかった場合

    except requests.exceptions.RequestException as e:
        print(f"HTTPリクエストエラー: {e}")
        return None
    except Exception as e:
        print(f"為替データの取得に失敗しました: {e}")
        return None

# デバッグ用の出力
usd_jpy_rate = get_usd_jpy_rate()
print(f"現在のドル円レート: {usd_jpy_rate}")
