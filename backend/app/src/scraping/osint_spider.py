import scrapy
from scrapy.crawler import CrawlerProcess
import urllib.parse
import sys
import json
import base64

class OSINTSpider(scrapy.Spider):
    name = "osint_spider"
    
    custom_settings = {
        'USER_AGENT': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36',
        'ROBOTSTXT_OBEY': False,
        'LOG_LEVEL': 'ERROR',  # Hide scrapy verbose logs from stdout
    }

    def __init__(self, query='', max_results=5, *args, **kwargs):
        super(OSINTSpider, self).__init__(*args, **kwargs)
        self.query = query
        self.max_results = int(max_results)
        self.results = []
        # Target Bing
        self.start_urls = [f"https://www.bing.com/search?q={urllib.parse.quote(query)}"]

    def parse(self, response):
        count = 0
        for li in response.css('li.b_algo'):
            if count >= self.max_results:
                break
                
            raw_href = li.css('a::attr(href)').get('')
            title = li.css('h2 a::text').get('')
            if not title:
                title = li.css('h2::text').get('')
            
            snippet = li.css('p::text').get('')
            if not snippet:
                snippet = li.css('.b_caption p::text').get('')

            clean_url = raw_href
            
            # Bing wraps URLs; extract from base64 u= parameter
            qs = urllib.parse.parse_qs(urllib.parse.urlparse(raw_href).query)
            if 'u' in qs and qs['u'][0].startswith('a1'):
                try:
                    clean_url = base64.b64decode(qs['u'][0][2:] + '==').decode('utf-8', errors='ignore')
                except:
                    pass
            
            if clean_url and title:
                self.results.append({
                    'url': clean_url,
                    'title': title.strip(),
                    'snippet': snippet.strip() if snippet else ''
                })
                count += 1
                
    def closed(self, reason):
        # Output JSON to stdout before exiting
        print(json.dumps(self.results))

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps([]))
        sys.exit(1)
        
    query = sys.argv[1]
    max_res = sys.argv[2] if len(sys.argv) > 2 else 5
    
    process = CrawlerProcess()
    process.crawl(OSINTSpider, query=query, max_results=max_res)
    process.start()
