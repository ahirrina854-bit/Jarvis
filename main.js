import {SpeechRecognition as NSR} from '@capacitor-community/speech-recognition';

const $=s=>document.querySelector(s),sleep=ms=>new Promise(r=>setTimeout(r,ms));
const you=$('#you'),say=$('#say'),act=$('#act'),inp=$('#inp'),mic=$('#mic'),statusEl=$('#status');
const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
const SYS="You are Jarvis, a calm, witty voice assistant on the user's Android phone. Reply in the same language and script the user wrote in: Hindi in Devanagari, Hinglish in Roman letters, or English. Keep answers to 1-3 short sentences because they are spoken aloud. No markdown, no lists, no emoji. Call the user boss now and then. You cannot control the phone or apps yourself; if asked, say so briefly and suggest what they can do.";
const SYS_HI="You are Jarvis, a calm, witty voice assistant on the user's Android phone. Always reply in Hindi written in Devanagari script, never in Roman letters, even if the user writes Roman Hinglish or English; write English loanwords in Devanagari too (for example यूट्यूब, मोबाइल). Keep answers to 1-3 short sentences because they are spoken aloud. No markdown, no lists, no emoji. Call the user बॉस now and then. You cannot control the phone or apps yourself; if asked, say so briefly.";
const MODEL='claude-haiku-5-5';
const SITES={youtube:'https://m.youtube.com',google:'https://www.google.com',whatsapp:'https://web.whatsapp.com',maps:'https://maps.google.com',instagram:'https://www.instagram.com',spotify:'https://open.spotify.com',gmail:'https://mail.google.com'};
const QUICK=[['Samay','samay kya hai'],['Tareekh','aaj ki tareekh'],['Battery','battery kitni hai'],['YouTube','youtube kholo'],['WhatsApp','whatsapp kholo'],['Maps','maps kholo'],['Joke','ek chhota sa joke sunao'],['Productive tips','mujhe aaj productive rehne ke 3 tips do']];
const cfg={voice:true,sfx:true,vib:true,micviz:false,pitch:.8,rate:.92};
let history=[],busy=false,lang='hi-IN',rec=null,listening=false,mode='idle';

/* header matrix */
(()=>{const c='01ABCDEF23456789';let s='';for(let i=0;i<1400;i++)s+=c[Math.random()*c.length|0]+(Math.random()<.12?' ':'');$('#mx').textContent=s})();

/* sound + haptics */
let AC;
function actx(){if(!AC){const C=window.AudioContext||window.webkitAudioContext;if(C)AC=new C()}if(AC&&AC.state==='suspended')AC.resume();return AC}
function beep(f1,f2,d,v=.06,type='sine'){if(!cfg.sfx)return;const a=actx();if(!a)return;const o=a.createOscillator(),g=a.createGain(),t=a.currentTime;o.type=type;o.frequency.setValueAtTime(f1,t);o.frequency.exponentialRampToValueAtTime(f2,t+d);g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(g);g.connect(a.destination);o.start();o.stop(t+d)}
const sfxOn=()=>beep(500,1100,.14),sfxOff=()=>beep(1000,420,.16),sfxDone=()=>{beep(700,950,.08);setTimeout(()=>beep(950,1400,.1),90)};
const vib=n=>{if(cfg.vib&&navigator.vibrate)navigator.vibrate(n)};

/* mic level (optional) */
let an=null,ms=null,lvl=0;
async function micStart(){try{ms=await navigator.mediaDevices.getUserMedia({audio:true});const a=actx(),src=a.createMediaStreamSource(ms);an=a.createAnalyser();an.fftSize=256;src.connect(an)}catch(e){an=null}}
function micStop(){if(ms)ms.getTracks().forEach(t=>t.stop());ms=null;an=null;lvl=0}
function level(){if(!an)return 0;const d=new Uint8Array(an.frequencyBinCount);an.getByteFrequencyData(d);let s=0;for(const v of d)s+=v;return Math.min(1,s/d.length/90)}

/* orb */
const cv=$('#orb'),cx=cv.getContext('2d');
let S=1,A=3.5,tx=0,ty=0,ttx=0,tty=0;
function fit(){const d=Math.min(window.devicePixelRatio||1,2);cv.width=cv.height=Math.max(10,Math.round(cv.clientWidth*d));S=cv.width/400}
addEventListener('resize',fit);
addEventListener('deviceorientation',e=>{ttx=Math.max(-1,Math.min(1,(e.gamma||0)/30));tty=Math.max(-1,Math.min(1,((e.beta||45)-45)/30))});
const P=[];for(let i=0;i<1100;i++)P.push({a:Math.random()*6.2832,b:Math.floor(Math.random()*3),j:Math.random(),s:.7+Math.random()*1.1,v:(Math.random()-.5)*.01});
const V=[],N=150;for(let i=0;i<N;i++){const y=1-2*(i+.5)/N,r=Math.sqrt(1-y*y),t=i*2.399963;V.push([Math.cos(t)*r,y,Math.sin(t)*r])}
const E=[];for(let i=0;i<N;i++)for(let j=i+1;j<N;j++){const dx=V[i][0]-V[j][0],dy=V[i][1]-V[j][1],dz=V[i][2]-V[j][2];if(dx*dx+dy*dy+dz*dz<.19)E.push([i,j])}
function draw(ms_){
  const t=ms_/1000,sp=mode==='think'?3:1;
  cx.setTransform(S,0,0,S,0,0);cx.clearRect(0,0,400,400);
  if(an)lvl+=(level()-lvl)*.4;
  const g=mode==='speak'?11+Math.sin(t*9)*3+Math.sin(t*23)*2:mode==='listen'?(an?5+lvl*22:8+Math.sin(t*13)*3):mode==='think'?6:3.5;
  A+=(g-A)*.12;tx+=(ttx-tx)*.08;ty+=(tty-ty)*.08;
  const ox=tx*5,oy=ty*5,lis=mode==='listen',gl=cx.createRadialGradient(200,200,10,200,200,190);
  gl.addColorStop(0,'rgba(63,208,212,.16)');gl.addColorStop(1,'rgba(63,208,212,0)');cx.fillStyle=gl;cx.fillRect(0,0,400,400);
  /* particle ring */
  cx.globalCompositeOperation='lighter';
  const col=lis?'120,220,255':'63,208,212';
  for(const p of P){p.a+=p.v*sp;const R=164+p.b*5+p.j*7+A*(Math.sin(p.a*5+t*sp)+.6*Math.sin(p.a*8-t*1.3*sp));cx.fillStyle='rgba('+col+','+(.25+p.j*.6).toFixed(2)+')';cx.fillRect(200+ox+R*Math.cos(p.a),200+oy+R*Math.sin(p.a),p.s,p.s)}
  /* segmented rings */
  const bc=mode==='speak'?'46,155,219':lis?'54,184,224':'31,111,163';
  const ring=(r,w,n,rot,k)=>{const st=6.2832/n;cx.lineWidth=w;for(let i=0;i<n;i++){cx.strokeStyle='rgba('+bc+','+(.4+.45*Math.max(0,Math.sin(i*.5-t*3*sp*k))).toFixed(2)+')';cx.beginPath();cx.arc(200+ox*.6,200+oy*.6,r,rot+i*st,rot+i*st+st*.82);cx.stroke()}};
  ring(128,28,48,t*.12*sp,1);ring(92,14,36,-t*.2*sp,-1);
  cx.lineWidth=1.3;cx.strokeStyle='rgba(30,142,150,.7)';[146,110,78].forEach(r=>{cx.beginPath();cx.arc(200+ox*.6,200+oy*.6,r,0,6.2832);cx.stroke()});
  /* 3D sphere */
  cx.globalCompositeOperation='source-over';
  const yaw=t*.35*sp,pit=.45+Math.sin(t*.2)*.15,cy=Math.cos(yaw),sy=Math.sin(yaw),cp=Math.cos(pit),spt=Math.sin(pit);
  const R3=66*(1+(mode==='speak'?.04*Math.sin(t*14):0)),qx=200-tx*8,qy=200-ty*8;
  const sg=cx.createRadialGradient(qx-20,qy-22,4,qx,qy,R3);sg.addColorStop(0,'rgba(95,183,187,.5)');sg.addColorStop(1,'rgba(6,48,58,.92)');
  cx.fillStyle=sg;cx.beginPath();cx.arc(qx,qy,R3,0,6.2832);cx.fill();
  const Q=V.map(v=>{const x=v[0]*cy+v[2]*sy,z=-v[0]*sy+v[2]*cy,y=v[1];return[qx+x*R3,qy+(y*cp-z*spt)*R3,y*spt+z*cp]});
  cx.lineWidth=.8;
  for(const [i,j] of E){const z=(Q[i][2]+Q[j][2])/2;cx.strokeStyle='rgba(143,211,214,'+(.1+.55*(z+1)/2).toFixed(2)+')';cx.beginPath();cx.moveTo(Q[i][0],Q[i][1]);cx.lineTo(Q[j][0],Q[j][1]);cx.stroke()}
  cx.fillStyle='rgba(220,250,255,.85)';for(const q of Q)if(q[2]>0)cx.fillRect(q[0]-.8,q[1]-.8,1.6,1.6);
  cx.lineWidth=3;cx.strokeStyle='rgba(168,222,224,.85)';cx.beginPath();cx.arc(qx,qy,R3,0,6.2832);cx.stroke();
}
function frame(m){draw(m);requestAnimationFrame(frame)}
fit();
if(matchMedia('(prefers-reduced-motion:reduce)').matches)draw(0);else requestAnimationFrame(frame);
function setState(s,t){mode=s;document.body.dataset.s=s;statusEl.textContent=t}

/* voice out */
function stopSpeak(){try{speechSynthesis.cancel()}catch(e){}}
function unlock(){try{const u=new SpeechSynthesisUtterance(' ');u.volume=0;speechSynthesis.speak(u)}catch(e){}}
function pickVoice(l){const vs=speechSynthesis.getVoices();return vs.find(v=>v.lang.replace('_','-')===l)||vs.find(v=>v.lang.toLowerCase().startsWith(l.slice(0,2)))||(l==='en-IN'?vs.find(v=>v.lang.toLowerCase().startsWith('en')):null)}
function speak(t){
  if(!cfg.voice||!t)return;
  if(!window.speechSynthesis){act.textContent='Is browser mein awaaz support nahi hai.';return}
  const u=new SpeechSynthesisUtterance(t);
  u.lang=/[\u0900-\u097F]/.test(t)?'hi-IN':'en-IN';
  const v=pickVoice(u.lang);if(v){u.voice=v;u.lang=v.lang}else if(u.lang==='hi-IN'&&speechSynthesis.getVoices().length)act.textContent='Hindi voice install nahi mili. Phone Settings → Text-to-speech → Google → Voice data mein Hindi (India) download karo.';
  u.pitch=cfg.pitch;u.rate=cfg.rate;
  u.onstart=()=>setState('speak','Bol raha hoon');
  u.onend=()=>setState('idle','Ready');
  u.onerror=e=>{setState('idle','Ready');if(e.error!=='canceled'&&e.error!=='interrupted')act.textContent='Awaaz nahi chal payi ('+(e.error||'error')+'). Google Text-to-speech aur media volume check karo.'};
  try{speechSynthesis.cancel();speechSynthesis.resume()}catch(e){}
  setTimeout(()=>speechSynthesis.speak(u),60)
}

/* brain */
async function local(t){
  const q=t.toLowerCase(),dev=/[\u0900-\u097F]/.test(t)||lang==='hi-IN',now=new Date();
  if(/(time|samay|kitne baje|baje hain|टाइम|समय|कितने बजे)/.test(q)){const H=now.getHours(),M=now.getMinutes(),s=now.toLocaleTimeString('en-IN',{hour:'numeric',minute:'2-digit'});const part=H<5?'रात':H<12?'सुबह':H<16?'दोपहर':H<20?'शाम':'रात';return{text:dev?'अभी '+part+' के '+(H%12||12)+' बजकर '+M+' मिनट हुए हैं।':'Abhi '+s+' ho raha hai.'}}
  if(/(date|tarikh|tareekh|aaj kya din|तारीख|आज कौन सा दिन)/.test(q)){const s=now.toLocaleDateString(dev?'hi-IN':'en-IN',{weekday:'long',day:'numeric',month:'long',year:'numeric'});return{text:dev?'आज '+s+' है।':'Aaj '+s+' hai.'}}
  if(/(battery|बैटरी)/.test(q)){try{const b=await navigator.getBattery(),p=Math.round(b.level*100);return{text:dev?'बैटरी '+p+' प्रतिशत है।':'Battery '+p+' percent hai'+(b.charging?', aur charge ho rahi hai.':'.')}}catch(e){return{text:'Is browser mein battery ka data nahi mil raha.'}}}
  if(/(open|kholo|khol|खोलो|खोल)/.test(q)){for(const k in SITES)if(q.includes(k))return{text:dev?'ठीक है, '+k+' तैयार है। नीचे टैप करें।':k+' ready hai. Neeche tap karo.',link:['Open '+k,SITES[k]]}}
  return null
}
function show(r){say.textContent=r.text;act.textContent='';if(r.link){const a=document.createElement('a');a.href=r.link[1];a.target='_blank';a.rel='noopener';a.textContent=r.link[0];act.appendChild(a)}}
async function ask(text){
  text=text.trim();
  if(busy||!text)return;
  busy=true;stopSpeak();
  you.textContent='“'+text+'”';say.textContent='';act.textContent='';
  history.push({r:'u',t:text});
  const l=await local(text);
  if(l){history.push({r:'j',t:l.text});show(l);sfxDone();vib(15);speak(l.text);busy=false;return}
  const KEY=(localStorage.getItem('jarvis_key')||'').trim();
  if(!KEY){say.textContent='Settings mein apni Anthropic API key daalo, phir dobara try karo.';setState('idle','Key chahiye');history.pop();busy=false;return}
  setState('think','Soch raha hoon');say.textContent='…';
  const msgs=[];
  for(const h of history.slice(-13)){const role=h.r==='u'?'user':'assistant';if(msgs.length&&msgs[msgs.length-1].role===role)msgs[msgs.length-1].content+='\n'+h.t;else msgs.push({role,content:h.t})}
  while(msgs.length&&msgs[0].role!=='user')msgs.shift();
  try{
    const res=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'content-type':'application/json','x-api-key':KEY,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},body:JSON.stringify({model:MODEL,max_tokens:300,system:(lang==='hi-IN'?SYS_HI:SYS),messages:msgs})});
    if(!res.ok){const code=res.status;throw {code}}
    const data=await res.json();
    const out=(data.content||[]).map(c=>c.text||'').join('').trim()||'Kuch samajh nahi aaya, dobara bolo.';
    say.textContent=out;history.push({r:'j',t:out});sfxDone();vib(15);speak(out);
  }catch(e){
    const c=e&&e.code;
    say.textContent=c===401?'API key galat hai. Settings mein dobara daalo.':c===429?'Thoda ruko boss, abhi bahut requests ho gayi.':c===400||c===402?'API account mein dikkat hai (credit ya request). Console check karo.':'Internet ya AI mein dikkat aayi. Dobara try karo.';
    history.pop();setState('idle','Ready');
  }
  busy=false
}

/* voice in (native Android) */
let lastPartial='';
async function listen(){
  vib(20);
  if(listening){try{await NSR.stop()}catch(e){}return}
  try{
    const av=await NSR.available();
    if(!av.available){say.textContent='Is phone mein speech recognition nahi hai. Google app update karo.';return}
    let p=await NSR.checkPermissions();
    if(p.speechRecognition!=='granted'){p=await NSR.requestPermissions();if(p.speechRecognition!=='granted'){say.textContent='Mic ki permission do: phone Settings mein Jarvis ko Microphone allow karo.';return}}
  }catch(e){say.textContent='Mic setup error: '+(e.message||e);return}
  stopSpeak();lastPartial='';you.textContent='';say.textContent='Boliye…';act.textContent='';
  try{await NSR.start({language:lang,partialResults:true,popup:false,maxResults:1})}catch(e){say.textContent='Mic start nahi hua: '+(e.message||e)}
}
NSR.addListener('partialResults',d=>{const t=(d.matches&&d.matches[0])||'';if(t){lastPartial=t;you.textContent='\u201c'+t+'\u201d'}});
NSR.addListener('listeningState',d=>{
  if(d.status==='started'){listening=true;setState('listen','Sun raha hoon');sfxOn()}
  else{if(!listening)return;listening=false;sfxOff();if(mode==='listen')setState('idle','Ready');const t=lastPartial.trim();lastPartial='';if(t)ask(t);else if(say.textContent==='Boliye\u2026')say.textContent=''}
});

/* ui */
QUICK.forEach(([l,q])=>{const b=document.createElement('button');b.type='button';b.className='chip';b.textContent=l;b.addEventListener('click',()=>{vib(10);beep(800,800,.04);ask(q)});$('#chips').appendChild(b)});
$('#f').addEventListener('submit',e=>{e.preventDefault();const t=inp.value;inp.value='';ask(t)});
mic.addEventListener('click',listen);
$('#lang').addEventListener('click',e=>{lang=lang==='hi-IN'?'en-IN':'hi-IN';e.target.textContent='Bhasha: '+(lang==='hi-IN'?'हिंदी':'English')});
$('#histb').addEventListener('click',()=>{const hl=$('#hl');hl.textContent='';if(!history.length)hl.textContent='Abhi koi baat nahi hui.';history.forEach(h=>{const d=document.createElement('div');d.className='m '+h.r;d.textContent=h.t;hl.appendChild(d)});$('#hist').hidden=false;hl.scrollTop=hl.scrollHeight});
$('#hx').addEventListener('click',()=>{$('#hist').hidden=true});
[['voice','Awaaz'],['sfx','Sound effects'],['vib','Vibration']].forEach(([k,l])=>{const b=document.createElement('button');b.type='button';b.className='tg';const up=()=>{b.textContent=l+': '+(cfg[k]?'on':'off')};up();b.addEventListener('click',()=>{cfg[k]=!cfg[k];up();if(k==='voice'&&!cfg.voice)stopSpeak()});$('#opts').insertBefore(b,$('#opts').firstChild)});
$('#pitch').addEventListener('input',e=>{cfg.pitch=+e.target.value});
$('#rate').addEventListener('input',e=>{cfg.rate=+e.target.value});
$('#test').addEventListener('click',()=>{const was=cfg.voice;cfg.voice=true;speak('सिस्टम ऑनलाइन है बॉस। सब कुछ ठीक चल रहा है।');cfg.voice=was});
$('#setb').addEventListener('click',()=>{$('#set').hidden=false});
$('#sx').addEventListener('click',()=>{$('#set').hidden=true});
addEventListener('pointerdown',unlock,{once:true});
if(window.speechSynthesis)speechSynthesis.getVoices();

/* boot */
const hr=new Date().getHours(),greet=(hr<12?'सुप्रभात':hr<17?'नमस्कार':'शुभ संध्या')+' बॉस। जार्विस ऑनलाइन है। बोलिए, क्या करना है?';
say.textContent=greet;
$('#go').addEventListener('click',async()=>{
  $('#go').hidden=true;unlock();actx();vib(30);
  const a=actx();if(a&&cfg.sfx){const o=a.createOscillator(),g=a.createGain(),t=a.currentTime;o.type='sawtooth';o.frequency.setValueAtTime(90,t);o.frequency.exponentialRampToValueAtTime(900,t+1.8);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.05,t+.4);g.gain.exponentialRampToValueAtTime(.0001,t+1.9);o.connect(g);g.connect(a.destination);o.start();o.stop(t+2)}
  const bl=$('#bl');
  for(const l of ['J.A.R.V.I.S. core v3.1','Neural link: connected','Voice module: ready','Display: calibrated','All systems online']){const d=document.createElement('div');d.textContent='> '+l;bl.appendChild(d);beep(1200,1200,.04,.03);await sleep(380)}
  await sleep(300);
  $('#boot').classList.add('off');document.body.classList.remove('boot');fit();
  setTimeout(()=>$('#boot').remove(),1000);
  setTimeout(()=>{sfxDone();speak(greet)},700);
});

const keyEl=document.getElementById('key');
keyEl.value=localStorage.getItem('jarvis_key')||'';
keyEl.addEventListener('change',()=>{localStorage.setItem('jarvis_key',keyEl.value.trim())});
