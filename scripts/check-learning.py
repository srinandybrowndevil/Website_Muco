"""Validate generated learning routes and the cross-site enquiry boundary."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit, unquote
import json
import subprocess

ROOT = Path(__file__).resolve().parents[1]


class Page(HTMLParser):
    def __init__(self, source):
        super().__init__()
        self.ids, self.links, self.images, self.enquiries = [], [], [], []
        self.courses = self.services = self.h1 = 0
        self.feed(source)

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        classes = a.get('class', '').split()
        if 'id' in a:
            self.ids.append(a['id'])
        self.h1 += tag == 'h1'
        self.courses += 'data-course' in a
        self.services += 'learning-service' in classes
        if tag == 'a':
            self.links.append(a.get('href', ''))
            if 'learning-enquiry' in classes:
                self.enquiries.append(a.get('href', ''))
        if tag == 'img':
            self.images.append(a)


def check():
    results = {}
    for name in ['learning.html', 'learning-portal.html']:
        source = (ROOT / name).read_text(encoding='utf-8')
        page = Page(source)
        assert page.h1 == 1, name + ': expected one H1'
        assert len(page.ids) == len(set(page.ids)), name + ': duplicate IDs'
        assert page.enquiries, name + ': missing course enquiry'
        assert all(u == 'https://way2me.in/contact/' for u in page.enquiries), 'Learning enquiries must go directly to Way2Me'
        for link in page.links:
            url = urlsplit(link)
            if url.scheme or url.netloc:
                continue
            path = unquote(url.path).lstrip('/')
            target = ROOT / (path or ('index.html' if link.startswith('/') else name))
            if not target.suffix:
                target = target.with_suffix('.html')
            assert target.is_file(), f'{name}: broken link {link}'
            if url.fragment:
                assert unquote(url.fragment) in Page(target.read_text(encoding='utf-8')).ids, f'{name}: broken anchor {link}'
        for img in page.images:
            assert img.get('alt'), f'{name}: image missing alt'
            assert (ROOT / img['src']).is_file(), f'{name}: image missing'
        assert 'yogahari.png' in source if name == 'learning.html' else True
        assert 'https://mucolabs.com/' + name.removesuffix('.html') in source
        results[name] = {'courses': page.courses, 'services': page.services, 'links_checked': len(page.links), 'enquiries_checked': len(page.enquiries)}
    assert results['learning.html']['courses'] == 65
    assert results['learning.html']['services'] == 8
    learning = (ROOT / 'learning.html').read_text(encoding='utf-8')
    assert 'learner-feedback' in learning
    assert '27 responses' in learning and '4.7/5' in learning
    assert 'SOA / ITER' in learning
    for name in ['main.js', 'analytics.js']:
        subprocess.run(['node', '--check', str(ROOT / name)], check=True)
    print(json.dumps(results, indent=2))


if __name__ == '__main__':
    check()
