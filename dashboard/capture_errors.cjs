const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('BROWSER CONSOLE ERROR:', msg.text());
    }
  });

  page.on('pageerror', err => {
    console.log('BROWSER PAGE ERROR:', err.toString());
  });

  await page.goto('http://localhost:8080/', { waitUntil: 'networkidle0', timeout: 10000 }).catch(e => console.log('GOTO ERROR:', e.message));
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  await browser.close();
})();
