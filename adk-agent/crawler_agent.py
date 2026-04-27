from google.adk.agents import Agent
from google.adk.runners import CliRunner
import requests
from bs4 import BeautifulSoup
from markdownify import markdownify as md
import json
import time

def search_web(search_term: str) -> list:
    """Return top 10 search result URLs for a term."""
    headers = {'User-Agent': 'Mozilla/5.0'}
    res = requests.get('https://www.google.com/search', params={'q': search_term}, headers=headers)
    soup = BeautifulSoup(res.text, 'html.parser')
    urls = []
    for a in soup.select('a[href^="/url?q="]')[:10]:
        url = a['href'].split('/url?q=')[1].split('&')[0]
        if url.startswith('http'):
            urls.append(url)
    return urls

def crawl_page(url: str) -> dict:
    """Crawl a page and return markdown content."""
    res = requests.get(url, headers={'User-Agent': 'Mozilla/5.0'})
    soup = BeautifulSoup(res.text, 'html.parser')
    return {
        'url': url, 
        'title': soup.title.string if soup.title else 'No Title', 
        'markdown': md(soup.body)
    }

def save_to_server(payload: dict):
    """Save crawled content to local server."""
    requests.post('http://localhost:3000/save-markdown', json=payload)

def crawl_and_index(search_term: str) -> str:
    """Crawl top results for a search term and save to local index."""
    urls = search_web(search_term)
    for url in urls:
        try:
            page = crawl_page(url)
            save_to_server({
                'markdown': page['markdown'],
                'url': page['url'],
                'title': page['title'],
                'searchTerm': search_term,
                'timestamp': time.strftime('%Y-%m-%dT%H:%M:%S')
            })
        except Exception as e:
            print(f"Error crawling {url}: {e}")
    return f"Crawled {len(urls)} pages for '{search_term}'"

crawler_agent = Agent(
    name="private_search_crawler",
    description="Automates web crawling and indexing for Private Search Engine",
    tools=[search_web, crawl_page, save_to_server, crawl_and_index]
)

if __name__ == "__main__":
    runner = CliRunner()
    runner.run(crawler_agent)
