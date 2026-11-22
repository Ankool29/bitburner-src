"""Repeatable UI-03 checks against a disposable webpack development server."""
import argparse
import json
import shutil
from pathlib import Path
from playwright.sync_api import sync_playwright

parser = argparse.ArgumentParser()
parser.add_argument('--url', default='http://127.0.0.1:8000')
parser.add_argument('--chromium', default=shutil.which('chromium'))
parser.add_argument('--output', default='/tmp/bitburner-ui03')
args = parser.parse_args()
out = Path(args.output); out.mkdir(parents=True, exist_ok=True)
checks = []

def check(name, condition):
    assert condition, name
    checks.append(name)
    print('PASS', name, flush=True)

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=args.chromium, headless=True, args=['--no-sandbox'])
    context = browser.new_context(viewport={'width':390,'height':844}, is_mobile=True, has_touch=True)
    page = context.new_page(); errors=[]
    page.add_init_script("window.__unhandled=[];window.addEventListener('unhandledrejection',e=>window.__unhandled.push(String(e.reason?.message||e.reason)))")
    page.on('pageerror', lambda e: errors.append(str(e)))
    try:
        page.goto(args.url)
        page.locator('#terminal-input').wait_for(timeout=120000)
        if page.get_by_role('button', name='Exit Tutorial', exact=True).count():
            page.get_by_role('button', name='Exit Tutorial', exact=True).click()
            page.get_by_role('button', name='Exit Tutorial', exact=True).wait_for(state='hidden')
        page.evaluate('''() => {
          window.webpackChunkbitburner.push([["ui03-windows"],{},r=>{window.__r=r;}]);
          window.__r('./src/Settings/Settings.ts').Settings.SuppressFactionInvites=true;
        }''')
        def wait(): page.wait_for_timeout(300)
        def prompt(text, kind='boolean'):
            page.evaluate('''({text,kind})=>window.__r('./src/ui/React/PromptManager.tsx').PromptEvent.emit({txt:text,options:{type:kind},resolve:v=>{window.__answer=v;}})''', {'text':text,'kind':kind})
            page.get_by_role('dialog').last.wait_for()
            wait()
        def close_dialog():
            page.get_by_role('button', name='Close dialog', exact=True).last.tap()
            wait()
        def inside(box,w,h):
            return box and box['x']>=-1 and box['y']>=-1 and box['x']+box['width']<=w+1 and box['y']+box['height']<=h+1
        for w,h in [(390,844),(844,390),(360,740),(1280,800)]:
            mobile=w<900
            label=f'{w}x{h}'
            page.set_viewport_size({'width':w,'height':h}); wait()
            if mobile:
                terminal=page.locator('#terminal-input');terminal.fill('draft command')
                page.evaluate("Object.defineProperty(window.visualViewport,'height',{configurable:true,value:250});window.visualViewport.dispatchEvent(new Event('resize'))")
                wait()
                check(label+' terminal input above virtual keyboard',inside(terminal.bounding_box(),w,250) and terminal.input_value()=='draft command')
                page.evaluate("delete window.visualViewport.height;window.visualViewport.dispatchEvent(new Event('resize'))");wait()
            prompt('UI-03: confirm this short message?')
            box=page.get_by_role('dialog').last.bounding_box()
            check(label+' compact confirmation', inside(box,w,h) and box['height']<min(400,h*.8))
            if mobile:
                check(label+' 44px close target',page.get_by_role('button',name='Close dialog').last.bounding_box()['height']>=44)
            page.screenshot(path=str(out/f'confirmation-{label}.png'))
            close_dialog()
            prompt('UI-03 long form\n'+('Long help text that must remain readable.\n'*70),'text')
            field=page.get_by_role('dialog').last.locator('input')
            field.fill('unsaved orientation draft')
            if mobile:
                check(label+' internally scrolling form',page.locator('.bb-modal-content').last.evaluate('(e)=>e.scrollHeight>e.clientHeight'))
                old_y=page.get_by_role('button',name='Close dialog').last.bounding_box()['y']
                page.locator('.bb-modal-content').last.evaluate('(e)=>e.scrollTop=0')
                check(label+' close remains outside scroller',abs(page.get_by_role('button',name='Close dialog').last.bounding_box()['y']-old_y)<1)
                field.focus()
                keyboard_height=max(250,h//2)
                page.evaluate('''height=>{Object.defineProperty(window.visualViewport,'height',{configurable:true,value:height});window.visualViewport.dispatchEvent(new Event('resize'));}''',keyboard_height)
                wait()
                check(label+' keyboard bounds',inside(page.get_by_role('dialog').last.bounding_box(),w,keyboard_height))
                fb=field.bounding_box(); body=page.locator('.bb-modal-content').last.bounding_box()
                check(label+' focused field remains visible',fb['y']>=body['y']-1 and fb['y']+fb['height']<=body['y']+body['height']+1)
                page.evaluate("delete window.visualViewport.height; window.visualViewport.dispatchEvent(new Event('resize'))")
                page.set_viewport_size({'width':h,'height':w});wait()
                check(label+' orientation retains draft',field.input_value()=='unsaved orientation draft')
                page.set_viewport_size({'width':w,'height':h});wait()
            close_dialog()
            page.evaluate("window.__r('./src/Documentation/root.ts').openDocumentationPopUp('nsDoc/bitburner.ns.md')")
            page.get_by_role('dialog').last.wait_for();wait()
            check(label+' long documentation bounded',inside(page.get_by_role('dialog').last.bounding_box(),w,h))
            page.locator('.bb-modal-content').last.evaluate('(e)=>e.scrollTop=e.scrollHeight')
            check(label+' documentation close stays visible',inside(page.get_by_role('button',name='Close dialog').last.bounding_box(),w,h))
            page.screenshot(path=str(out/f'documentation-{label}.png'))
            prompt('Second window above documentation')
            check(label+' two dialogs coexist',page.locator('[role=dialog]').count()==2)
            close_dialog()
            check(label+' lower dialog survives closing top',page.get_by_role('dialog').count()==1)
            close_dialog()
            if mobile:
                page.get_by_role('button',name='Menu',exact=True).tap();wait()
                check(label+' menu within viewport',inside(page.locator('.MuiPopover-paper').bounding_box(),w,h))
                page.get_by_role('menuitem',name='Fermer le menu',exact=True).tap();wait()
                page.get_by_role('button',name='Menu',exact=True).tap();wait()
                page.get_by_role('menuitem',name='Overview',exact=True).tap();wait()
                overview=page.get_by_role('button',name='expand or collapse character overview',exact=True)
                check(label+' overview accessible from menu',overview.is_visible() and overview.get_attribute('aria-expanded')=='true')
                overview.tap();wait()
                check(label+' closed overview does not cover headers',not overview.is_visible())
            page.evaluate('''()=>{
             const {RunningScript}=window.__r('./src/Script/RunningScript.ts');
             window.__qaLogs=[11001,11002].map((pid,i)=>{
               const log=new RunningScript();log.pid=pid;log.filename=i?'qa-second.js':'qa-first.js';log.server='home';
               log.logs=Array.from({length:120},(_,n)=>'log line '+n+' — long output '+'.'.repeat(70));
               window.__r('./src/ui/React/LogBoxManager.tsx').LogBoxEvents.emit(log);return log;
             });
            }''');wait()
            if mobile:
                check(label+' log constrained',inside(page.get_by_role('region',name='Script log 11002',exact=True).bounding_box(),w,h))
                page.get_by_role('button',name='Minimize log',exact=True).tap();wait()
                check(label+' one tap minimizes log',page.get_by_role('region',name='Script log 11002',exact=True).bounding_box()['height']<=50)
                page.get_by_role('button',name='Expand log',exact=True).tap();wait()
                page.get_by_role('button',name='qa-first.js #11001',exact=True).tap();wait()
                check(label+' switch between log windows',page.get_by_role('region',name='Script log 11001',exact=True).is_visible())
                page.evaluate('window.__qaLogs[0].tailProps.setSize(500,400);window.__qaLogs[0].tailProps.setPosition(180,120)')
                page.set_viewport_size({'width':1280,'height':800});wait()
                b=page.get_by_role('region',name='Script log 11001',exact=True).bounding_box()
                check(label+' desktop restores log geometry',abs(b['x']-180)<2 and abs(b['y']-120)<2 and abs(b['width']-500)<2)
                page.set_viewport_size({'width':w,'height':h});wait()
                page.screenshot(path=str(out/f'logs-{label}.png'))
            page.evaluate("window.__r('./src/ui/React/LogBoxManager.tsx').LogBoxClearEvents.emit()")
            wait()
            code='export async function main(ns) {\n  await ns.sleep(1000);\n}'
            page.evaluate('''({code,w})=>{const {Router,Page}=window.__r('./src/ui/Router.ts');Router.toPage(Page.ScriptEditor,{files:new Map([['ui03-'+w+'.js',code]]),options:{vim:false,hostname:'home'}})}''',{'code':code,'w':w})
            page.locator('.monaco-editor').first.wait_for();wait()
            if mobile:
                check(label+' tactile editor preserved',page.get_by_role('toolbar',name='Raccourcis de saisie').is_visible())
                page.evaluate('''()=>{const api=window.__r('./node_modules/monaco-editor/esm/vs/editor/editor.api.js');window.__editor=api.editor.getEditors().find(e=>e.getModel()?.uri.path.includes('ui03-'));window.__editor.setPosition({lineNumber:2,column:3});window.__before=window.__editor.getValue();}''')
                page.get_by_role('button',name='Insérer ()',exact=True).tap()
                check(label+' editor insertion still works','()await' in page.evaluate('window.__editor.getValue()'))
                page.evaluate('window.__editor.trigger("qa","undo",null)')
                check(label+' editor undo preserved',page.evaluate('window.__editor.getValue()===window.__before'))
            else:
                check(label+' desktop toolbar preserved',page.get_by_role('button',name='Beautify',exact=True).is_visible())
                check(label+' mobile editor tools hidden',page.get_by_role('toolbar',name='Raccourcis de saisie').count()==0)
            page.wait_for_timeout(250)  # Let Monaco's 50ms highlight debounce settle before teardown.
            page.evaluate("window.__r('./src/ui/Router.ts').Router.toPage(window.__r('./src/ui/Router.ts').Page.Terminal)");wait()
        errors.extend(page.evaluate('window.__unhandled'))
        check('No JavaScript runtime errors',not errors)
        (out/'window-checks.json').write_text(json.dumps({'checks':checks,'errors':errors},indent=2))
        print('TOTAL',len(checks),flush=True)
    except Exception:
        print('BODY',page.locator('body').inner_text()[-3000:],flush=True)
        print('ERRORS',errors,flush=True)
        page.screenshot(path=str(out/'failure.png'))
        raise
    finally:
        browser.close()
