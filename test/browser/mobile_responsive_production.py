import json,re,argparse,shutil
from pathlib import Path
from playwright.sync_api import sync_playwright
parser=argparse.ArgumentParser()
parser.add_argument('--url',default='http://127.0.0.1:8010')
parser.add_argument('--output',default='/tmp/bitburner-ui03-production')
parser.add_argument('--chromium',default=shutil.which('chromium'))
args=parser.parse_args()
out=Path(args.output);out.mkdir(parents=True,exist_ok=True)
checks=[]
def check(name,condition):
 assert condition,name
 checks.append(name);print('PASS',name,flush=True)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=args.chromium,headless=True,args=['--no-sandbox'])
 context=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
 context.grant_permissions(['clipboard-read','clipboard-write'],origin=args.url)
 page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.add_init_script("window.__unhandled=[];window.addEventListener('unhandledrejection',e=>window.__unhandled.push(String(e.reason?.message||e.reason)))")
 try:
  page.goto(args.url);page.locator('#terminal-input').wait_for(timeout=120000)
  if page.get_by_role('button',name='Exit Tutorial',exact=True).count():
   page.get_by_role('button',name='Exit Tutorial',exact=True).click();page.get_by_role('button',name='Exit Tutorial',exact=True).wait_for(state='hidden')
  page.get_by_role('button',name='Menu',exact=True).tap()
  page.get_by_role('menuitem',name='Options',exact=True).tap()
  page.get_by_role('button',name='Options navigation: System',exact=True).wait_for()
  page.get_by_role('menu').wait_for(state='hidden');page.wait_for_timeout(500)
  check('Production options panel readable',page.get_by_role('button',name='Options navigation: System',exact=True).is_visible())
  page.screenshot(path=str(out/'portrait.png'))
  page.get_by_role('button',name='Terminal',exact=True).tap()
  page.locator('#terminal-input').fill('nano ui03-preview.js');page.locator('#terminal-input').press('Enter')
  page.get_by_role('button',name='Instructions',exact=True).wait_for()
  page.wait_for_function("!document.querySelector('button[aria-label=\"Insérer ns.\"]').disabled")
  page.locator('.monaco-editor .view-lines').first.click(position={'x':100,'y':35})
  page.keyboard.press('Control+A');page.keyboard.press('Backspace')
  code='export async function main(ns) {\n  ns.ui.openTail();\n  ns.print("UI-03 : aperçu indépendant");\n  while (true) {\n    await ns.sleep(1000);\n    ns.print("Journal tactile : fenêtre responsive active");\n  }\n}'
  page.evaluate('(code)=>navigator.clipboard.writeText(code)',code);page.keyboard.press('Control+V');page.wait_for_timeout(1000)
  check('Free JavaScript paste works in production','ns.ui.openTail' in page.locator('.monaco-editor .view-lines').first.inner_text())
  page.get_by_role('button',name='Exécuter',exact=True).tap()
  log=page.get_by_role('region',name=re.compile('^Script log '));log.wait_for(timeout=30000)
  check('Production script opens a real log window',log.is_visible())
  for w,h in [(390,844),(844,390),(360,740)]:
   page.set_viewport_size({'width':w,'height':h});page.wait_for_timeout(400)
   page.get_by_role('button',name='Minimize log',exact=True).tap();page.wait_for_timeout(200)
   check(f'{w}x{h} log minimizes once',log.bounding_box()['height']<=50)
   page.get_by_role('button',name='Sauver',exact=True).tap()
   check(f'{w}x{h} save accessible below minimized logs',True)
   bar=page.get_by_role('toolbar',name='Script log windows').bounding_box();save=page.get_by_role('button',name='Sauver',exact=True).bounding_box()
   check(f'{w}x{h} log selector does not cover editor actions',bar['y']+bar['height']<=save['y'])
   page.get_by_role('button',name='Expand log',exact=True).tap();page.wait_for_timeout(250)
   box=log.bounding_box();check(f'{w}x{h} real log stays in viewport',box['x']>=0 and box['y']>=0 and box['x']+box['width']<=w and box['y']+box['height']<=h)
   if w==844:
    page.wait_for_timeout(3500);page.screenshot(path=str(out/'landscape.png'))
  page.set_viewport_size({'width':1280,'height':800});page.wait_for_timeout(400)
  check('Production desktop toolbar preserved',page.get_by_role('button',name='Beautify',exact=True).is_visible())
  check('Production mobile toolbar hidden on desktop',page.get_by_role('toolbar',name='Raccourcis de saisie').count()==0)
  page.get_by_role('button',name='Stop script',exact=True).click()
  page.get_by_role('button',name='Re-run script',exact=True).wait_for()
  check('Original stop handler still works',True)
  page.get_by_role('button',name='Close log window',exact=True).click()
  check('Log closes',log.count()==0)
  errors.extend(page.evaluate('window.__unhandled'))
  check('No production runtime errors',not errors)
  (out/'checks.json').write_text(json.dumps({'checks':checks,'errors':errors},indent=2))
  print('TOTAL',len(checks),flush=True)
 except Exception:
  print('BODY',page.locator('body').inner_text()[-3000:],flush=True);print('ERRORS',errors,flush=True)
  page.screenshot(path=str(out/'failure.png'));raise
 finally:browser.close()
