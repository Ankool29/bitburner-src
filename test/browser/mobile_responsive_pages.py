import json
import argparse
import shutil
from playwright.sync_api import sync_playwright
parser=argparse.ArgumentParser()
parser.add_argument('--url',default='http://127.0.0.1:8000')
parser.add_argument('--output',default='/tmp/bitburner-ui03-pages')
parser.add_argument('--chromium',default=shutil.which('chromium'))
args=parser.parse_args()
ROOT=args.output
from pathlib import Path
Path(ROOT).mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
    errors=[]
    results=[]
    routes=['Stats','Hacknet','Factions','Faction','FactionAugmentations','Augmentations','Options','ActiveScripts','CreateProgram','City','Travel','StockMarket','Gang','Corporation','Bladeburner','Sleeves','Grafting','Go','StaneksGift','Achievements','Milestones','Documentation','ThemeBrowser','OptionsKeyBinding','CorpDivision','GangEquipment','GoStatus','Location','DarkNet']
    # Close each device context before loading the next large Darknet canvas.
    for w,h in [(390,844),(844,390),(360,740),(1280,800)]:
        browser=p.chromium.launch(executable_path=args.chromium,headless=True,args=['--no-sandbox'])
        context=browser.new_context(viewport={'width':w,'height':h},is_mobile=w<900,has_touch=w<900)
        page=context.new_page()
        page.on('pageerror',lambda e: errors.append(str(e)))
        page.goto(args.url);page.locator('#terminal-input').wait_for(timeout=120000)
        if page.get_by_role('button',name='Exit Tutorial',exact=True).count():
            page.get_by_role('button',name='Exit Tutorial',exact=True).click();page.get_by_role('button',name='Exit Tutorial',exact=True).wait_for(state='hidden')
        page.evaluate('''() => {
            window.webpackChunkbitburner.push([["ui03-sweep"],{},r=>{window.__r=r;}]);
            const P=window.__r('./src/Player.ts').Player;
            window.__r('./src/Settings/Settings.ts').Settings.SuppressFactionInvites=true;
            P.money=1e15;
            P.factions=['CyberSec','Slum Snakes'];
            const F=window.__r('./src/Faction/Factions.ts').Factions;
            P.factions.forEach(n=>F[n].isMember=true);
            P.startCorporation('QA mobile',false);
            const D=window.__r('./src/Corporation/Division.ts').Division;
            P.corporation.divisions.set('QA Agriculture',new D({name:'QA Agriculture',industry:'Agriculture'}));
            P.startBladeburner();
            P.startGang('Slum Snakes',false);
            const Member=window.__r('./src/Gang/GangMember.ts').GangMember;
            P.gang.members.push(new Member('QA member'));
            const Sleeve=window.__r('./src/PersonObjects/Sleeve/Sleeve.ts').Sleeve;
            P.sleeves=[new Sleeve(),new Sleeve()];
            const Node=window.__r('./src/Hacknet/HacknetNode.ts').HacknetNode;
            P.hacknetNodes.push(new Node('QA node'));
            P.hasWseAccount=true;
        }''')
        for name in routes:
            try:
                page.evaluate('''name=>{
                    const {Page,Router}=window.__r('./src/ui/Router.ts');
                    const alias={OptionsKeyBinding:'Options',CorpDivision:'Corporation',GangEquipment:'Gang',GoStatus:'Go'};
                    let actual=alias[name]||name;
                    let c=undefined;
                    if(name==='Options'||name==='ActiveScripts'||name==='Documentation')c={};
                    if(name==='Faction'||name==='FactionAugmentations')c={faction:window.__r('./src/Faction/Factions.ts').Factions.CyberSec};
                    if(name==='OptionsKeyBinding')c={tab:'Key Binding'};
                    if(name==='Location')c={location:window.__r('./src/Locations/Locations.ts').Locations.MegaCorp};
                    Router.toPage(Page[actual],c);
                }''',name)
                page.wait_for_timeout(250)
                if name=='CorpDivision': page.get_by_role('tab',name='QA Agriculture',exact=True).click()
                if name=='GangEquipment': page.get_by_role('tab',name='Equipment',exact=True).click()
                if name=='GoStatus': page.get_by_role('tab',name='Status',exact=True).click()
                page.wait_for_timeout(150)
                data=page.evaluate('''()=>{
                    const area=document.querySelector('.bb-responsive-page');
                    const bad=area?[...area.querySelectorAll('*')].filter(e=>{
                            const b=e.getBoundingClientRect();if(b.width===0 || b.right<=innerWidth+2)return false;
                            let n=e;while(n && n!==area){const s=getComputedStyle(n);if(['auto','scroll'].includes(s.overflowX)&&n.scrollWidth>n.clientWidth)return false;n=n.parentElement;}
                            return true;
                    }).slice(0,5).map(e=>({tag:e.tagName,text:e.textContent.slice(0,50),width:Math.round(e.getBoundingClientRect().width),right:Math.round(e.getBoundingClientRect().right)})):[];
                    return {pageWidth:document.documentElement.scrollWidth,area:area?{width:area.clientWidth,scroll:area.scrollWidth}:null,bad,text:document.body.innerText.slice(0,100)};
                }''')
                results.append({'size':[w,h],'route':name,**data});print(json.dumps(results[-1]),flush=True)
                if name in ['Stats','Corporation','Options','Sleeves'] and w in [390,844]:page.screenshot(path=f'{ROOT}/{name.lower()}-{w}x{h}.png')
            except Exception as e:
                results.append({'size':[w,h],'route':name,'error':str(e)});print('ERROR',name,e,flush=True)

        context.close()
        browser.close()
    with open(ROOT+'/page-sweep.json','w') as f:json.dump({'pages':results,'errors':errors},f,indent=2)
    print('RUNTIME_ERRORS',errors,flush=True)
    failures=[r for r in results if 'error' in r or (r['size'][0]<900 and (r.get('bad') or r['pageWidth']>r['size'][0]+2))]
    assert not failures, json.dumps(failures,indent=2)
    assert not errors, errors
