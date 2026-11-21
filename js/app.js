
"use strict";
/* Farm Diary prototype UI. Needs js/parser.js loaded first (parse, iso). */
/* ---------- state ---------- */
var online = true;
var entries = [];
var pending = null;       // parsed entry awaiting confirmation
var listenTimer = null;
var uid = 0;

function seed(){
  entries = [];
  var S = [
    // [date, type, crop, item, amount, qty]
    ["2026-06-12","e","Wheat","Seed",3200,""],["2026-06-20","e","Wheat","Fertilizer",4800,""],["2026-07-02","e","Wheat","Labour",4500,""],["2026-11-05","s","Wheat","Wheat sold",22000,"8 quintal"],
    ["2026-06-18","e","Rice","Seed",2500,""],["2026-07-09","e","Rice","Water / diesel",4000,""],["2026-08-01","e","Rice","Labour",4500,""],["2026-10-28","s","Rice","Rice sold",17000,"9 quintal"],
    ["2026-07-15","e","Veg","Seed",1800,""],["2026-08-04","e","Veg","Spray",3200,""],["2026-09-12","s","Veg","Vegetables sold",9000,""]
  ];
  S.forEach(function(r){entries.push({id:++uid,date:r[0],type:r[1],crop:r[2],item:r[3],amount:r[4],qty:r[5],synced:true,heard:""});});
}
seed();

/* ---------- helpers ---------- */
function $(id){return document.getElementById(id);}
function inr(n){return "₹"+Math.round(n).toLocaleString("en-IN");}
function fmtDate(s){var d=new Date(s+"T00:00:00");return d.toLocaleDateString("en-IN",{day:"numeric",month:"short"});}
var TYPES={e:"Expense",s:"Sale",h:"Harvest"};
function toast(t){var el=$("toast");el.textContent=t;el.classList.add("on");setTimeout(function(){el.classList.remove("on");},2200);}

/* ---------- views ---------- */
function show(v){
  ["home","listen","confirm","diary","sum"].forEach(function(k){$("v-"+k).classList.toggle("on",k===v);});
  document.querySelectorAll("#nav button").forEach(function(b){b.classList.toggle("on",b.dataset.go===v||(v==="listen"||v==="confirm")&&b.dataset.go==="home");});
  if(v==="sum")renderSummary(); if(v==="diary")renderDiary(); if(v==="home")renderHome();
}
function entryHTML(e){
  var dot=e.type==="e"?"−":e.type==="s"?"+":"H";
  var cls=e.type;
  var amt=e.type==="h"?"":("<div class='amt'>"+(e.type==="e"?"−":"+")+inr(e.amount)+"<small class='"+(e.synced?"sy":"ns")+"'>"+(e.synced?"✓ synced":"saved offline")+"</small></div>");
  if(e.type==="h")amt="<div class='amt'><small class='"+(e.synced?"sy":"ns")+"'>"+(e.synced?"✓ synced":"saved offline")+"</small></div>";
  return "<div class='entry'><div class='dot "+cls+"'>"+dot+"</div><div class='m'><b>"+e.item+"</b><small>"+TYPES[e.type]+" · "+e.crop+" · "+fmtDate(e.date)+(e.qty?" · "+e.qty:"")+"</small></div>"+amt+"</div>";
}
function sorted(){return entries.slice().sort(function(a,b){return a.date<b.date?1:a.date>b.date?-1:b.id-a.id;});}
function renderHome(){
  $("latest").innerHTML=sorted().slice(0,3).map(entryHTML).join("");
  var q=entries.filter(function(e){return !e.synced;}).length;
  $("queueTxt").textContent=q?q+" waiting to sync":"";
}
function renderDiary(){
  $("all").innerHTML=sorted().map(entryHTML).join("");
  $("diaryCount").textContent=entries.length+" entries";
}
function totals(){
  var by={},p=0;
  entries.forEach(function(e){
    if(e.type==="h")return;
    var c=by[e.crop]||(by[e.crop]={s:0,e:0});
    if(e.type==="s")c.s+=e.amount;else c.e+=e.amount;
  });
  Object.keys(by).forEach(function(k){p+=by[k].s-by[k].e;});
  return {by:by,profit:p};
}
function renderSummary(){
  var t=totals(); $("profit").textContent=inr(t.profit);
  var keys=Object.keys(t.by).filter(function(k){return t.by[k].s||t.by[k].e;});
  var max=1; keys.forEach(function(k){max=Math.max(max,t.by[k].s,t.by[k].e);});
  var W=320,H=190,base=160,top=14,gw=W/keys.length,svg="";
  keys.forEach(function(k,i){
    var cx=gw*i+gw/2, bw=Math.min(34,gw/3);
    var hs=(t.by[k].s/max)*(base-top), he=(t.by[k].e/max)*(base-top);
    svg+="<rect x='"+(cx-bw-2)+"' y='"+(base-hs)+"' width='"+bw+"' height='"+hs+"' rx='4' fill='#4f9a74'/>";
    svg+="<rect x='"+(cx+2)+"' y='"+(base-he)+"' width='"+bw+"' height='"+he+"' rx='4' fill='#b3402f'/>";
    svg+="<text x='"+cx+"' y='"+(base+18)+"' text-anchor='middle' font-size='12' fill='#55655d'>"+k+"</text>";
  });
  svg+="<line x1='0' y1='"+base+"' x2='"+W+"' y2='"+base+"' stroke='#cfe0d5'/>";
  $("chart").innerHTML=svg;
  $("cropRows").innerHTML=keys.map(function(k){var pr=t.by[k].s-t.by[k].e;return "<div class='row'><span>"+k+"</span><span style='color:"+(pr<0?"#b3402f":"#144d34")+"'>"+(pr<0?"−":"")+inr(Math.abs(pr))+"</span></div>";}).join("");
  $("cap").classList.remove("on");
}

/* ---------- speaking flow ---------- */
var PHRASES=[
  ["Aaj beej par 1200 rupaye lage","Seed expense, ₹1,200, today"],
  ["Kal gehu mein khaad par dhai hazaar rupaye lage","Fertilizer for wheat, “dhai hazaar” = 2,500"],
  ["Aaj mazdoori par paanch sau rupaye diye","Labour, “paanch sau” = 500"],
  ["Kal 10 quintal gehu becha 2500 rupaye quintal","Sale: 10 quintal at ₹2,500 per quintal = ₹25,000"],
  ["Aaj 12 quintal dhaan kata","Harvest, no money involved"]
];
function fillChips(el,fn){el.innerHTML="";PHRASES.forEach(function(p){var b=document.createElement("button");b.className=el.id==="listenChips"?"":"chip";b.innerHTML=el.id==="listenChips"?p[0]:p[0]+"<small>"+p[1]+"</small>";b.onclick=function(){fn(p[0]);};el.appendChild(b);});}
function startListening(){
  show("listen"); $("heard").textContent="…"; $("listenTxt").textContent="Listening…";
}
function simulate(phrase){
  show("listen"); $("listenTxt").textContent="Listening…"; $("heard").innerHTML="";
  var i=0; clearInterval(listenTimer);
  var words=phrase.split(" ");
  listenTimer=setInterval(function(){
    i++; $("heard").innerHTML="<b>"+words.slice(0,i).join(" ")+"</b>";
    if(i>=words.length){clearInterval(listenTimer);setTimeout(function(){confirmScreen(phrase);},500);}
  },170);
}
function confirmScreen(phrase){
  pending=parse(phrase); var p=pending;
  $("heardConf").textContent="“"+phrase+"”";
  $("cType").textContent=TYPES[p.type];
  var rows=[["Item",p.item||"—"],["Crop",p.crop]];
  if(p.type!=="h")rows.push(["Amount",p.amount?inr(p.amount):"—"]);
  if(p.qty)rows.push(["Quantity",p.qty]);
  rows.push(["Date",p.when+" ("+fmtDate(p.date)+")"]);
  $("cRows").innerHTML=rows.map(function(r){return "<div class='row'><span>"+r[0]+"</span><span>"+r[1]+"</span></div>";}).join("");
  $("confBadge").innerHTML="<span class='conf "+(p.conf>.8?"hi":"lo")+"'>Heard clearly "+Math.round(p.conf*100)+"%</span>";
  var w=$("warn"); if(p.flags.length||!p.ok){w.textContent=(p.flags.join(". ")||"Please say it again")+". Tap “Say again” to fix it.";w.classList.add("on");}else w.classList.remove("on");
  $("yes").disabled=!p.ok; $("yes").style.opacity=p.ok?1:.45;
  show("confirm");
}
$("mic").onclick=function(){startListening();};
$("micLive").onclick=function(){};
$("cancelListen").onclick=function(){clearInterval(listenTimer);show("home");};
$("again").onclick=function(){startListening();};
$("yes").onclick=function(){
  if(!pending||!pending.ok)return;
  entries.push({id:++uid,date:pending.date,type:pending.type,crop:pending.crop,item:pending.item,amount:pending.amount||0,qty:pending.qty,synced:online,heard:pending.heard});
  toast(online?"Saved ✓ (will back up to cloud)":"Saved offline ✓ – works without internet");
  pending=null; if(online)syncAll(true); show("home");
};
document.querySelectorAll("#nav button").forEach(function(b){b.onclick=function(){show(b.dataset.go);};});

/* ---------- online / offline + sync ---------- */
function setNet(v){
  online=v; var n=$("net"); n.classList.toggle("off",!v);
  $("netTxt").textContent=v?"Online":"No internet"; $("netIcon").textContent=v?"●":"✕";
  if(v){var q=entries.filter(function(e){return !e.synced;}).length; if(q)syncAll(false);}
  else toast("Internet off – everything still works");
  renderHome(); if($("v-diary").classList.contains("on"))renderDiary();
}
function syncAll(silent){
  var q=entries.filter(function(e){return !e.synced;}); if(!q.length)return;
  if(!silent)toast("Syncing "+q.length+" saved "+(q.length>1?"entries":"entry")+"…");
  setTimeout(function(){q.forEach(function(e){e.synced=true;});renderHome();if($("v-diary").classList.contains("on"))renderDiary();if(!silent)toast("All entries backed up ✓");},1400);
}
$("net").onclick=function(){setNet(!online);};

/* ---------- read aloud ---------- */
$("read").onclick=function(){
  var t=totals(), n=Math.round(t.profit);
  var best="",bp=-1e12; Object.keys(t.by).forEach(function(k){var p=t.by[k].s-t.by[k].e;if(p>bp){bp=p;best=k;}});
  var roman="Is saal aapka munaafa "+n.toLocaleString("en-IN")+" rupaye hai. Sabse achha faayda "+best+" mein hua.";
  var hindi="इस साल आपका मुनाफ़ा "+n+" रुपये है। सबसे अच्छा फ़ायदा "+({Wheat:"गेहूं",Rice:"धान",Veg:"सब्ज़ी",Sugarcane:"गन्ना",General:"आम"}[best]||best)+" में हुआ।";
  var c=$("cap"); c.innerHTML="🔊 <b>"+roman+"</b><br><span style='color:var(--mu)'>You made "+inr(n)+" profit this year; "+best+" paid best.</span>"; c.classList.add("on");
  try{
    if("speechSynthesis" in window){speechSynthesis.cancel();var u=new SpeechSynthesisUtterance(hindi);u.lang="hi-IN";u.rate=.9;speechSynthesis.speak(u);}
  }catch(e){}
};

/* ---------- side panel ---------- */
fillChips($("phraseChips"),function(p){simulate(p);});
fillChips($("listenChips"),function(p){simulate(p);});
$("reset").onclick=function(){seed();setNet(true);show("home");toast("Sample data restored");};
$("realMic").onclick=function(){
  var SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR){toast("This browser has no speech recognition – use the phrase buttons");return;}
  try{
    var r=new SR(); r.lang="hi-IN"; r.interimResults=false;
    startListening();
    r.onresult=function(ev){var t=ev.results[0][0].transcript;$("heard").innerHTML="<b>"+t+"</b>";setTimeout(function(){confirmScreen(t);},500);};
    r.onerror=function(){toast("Mic not available here – use the phrase buttons");show("home");};
    r.start();
  }catch(e){toast("Mic not available here – use the phrase buttons");show("home");}
};
function tick(){var d=new Date();$("clock").textContent=("0"+d.getHours()).slice(-2)+":"+("0"+d.getMinutes()).slice(-2);}
tick(); setInterval(tick,30000);
renderHome();
