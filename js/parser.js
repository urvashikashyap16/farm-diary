/* Farm Diary: rule-based parser for spoken Hindi (Roman or Devanagari) farm entries.
 * Pure functions, no DOM. In the real Android app this logic runs on the phone
 * after offline speech-to-text (Vosk) has produced the text.
 */
"use strict";
function iso(d){return d.getFullYear()+"-"+("0"+(d.getMonth()+1)).slice(-2)+"-"+("0"+d.getDate()).slice(-2);}

/* ---------- rule-based Hindi parser (the real app does this on-device) ---------- */
var DEV = {"०":"0","१":"1","२":"2","३":"3","४":"4","५":"5","६":"6","७":"7","८":"8","९":"9"};
var DEVWORDS = {"आज":"aaj","कल":"kal","परसों":"parso","बीज":"beej","खाद":"khaad","डीजल":"diesel","मजदूरी":"mazdoori","दवा":"dawai","गेहूं":"gehu","गेहूँ":"gehu","धान":"dhaan","चावल":"chawal","गन्ना":"ganna","आलू":"aloo","सब्जी":"sabzi","रुपये":"rupaye","रुपए":"rupaye","रुपया":"rupaye","क्विंटल":"quintal","किलो":"kilo","लगे":"lage","लगा":"lage","खर्चा":"kharcha","खर्च":"kharch","बेचा":"becha","बेची":"becha","बिका":"bika","बिकी":"bika","काटा":"kata","काटी":"kata","हुई":"hui","हुआ":"hua","पैदा":"paida","पर":"par","सौ":"sau","हजार":"hazaar","हज़ार":"hazaar","ढाई":"dhai","डेढ़":"derh","एक":"ek","दो":"do","तीन":"teen","चार":"char","पांच":"paanch","पाँच":"paanch","छह":"chhe","छः":"chhe","सात":"saat","आठ":"aath","नौ":"nau","दस":"das","बीस":"bees","पच्चीस":"pachees","तीस":"tees","चालीस":"chalis","पचास":"pachas","साठ":"saath","सत्तर":"sattar","अस्सी":"assi","नब्बे":"nabbe","बारह":"barah","पंद्रह":"pandrah","पन्द्रह":"pandrah"};
var NUM = {ek:1,do:2,teen:3,char:4,chaar:4,paanch:5,panch:5,chhe:6,chheh:6,che:6,saat:7,sat:7,aath:8,ath:8,nau:9,das:10,dus:10,gyarah:11,barah:12,terah:13,chaudah:14,pandrah:15,solah:16,satrah:17,atharah:18,unnees:19,bees:20,pachees:25,pacchis:25,tees:30,chalis:40,chaalis:40,pachas:50,paanchas:50,saath:60,sattar:70,assi:80,nabbe:90};
var UNITS={quintal:"quintal",kwintal:"quintal",kilo:"kg",kg:"kg",bori:"bag",bag:"bag"};
var ITEMS=[["beej","Seed"],["seed","Seed"],["khaad","Fertilizer"],["khad","Fertilizer"],["fertilizer","Fertilizer"],["urea","Fertilizer"],["diesel","Water / diesel"],["sinchai","Water / diesel"],["pani","Water / diesel"],["bijli","Water / diesel"],["mazdoori","Labour"],["majduri","Labour"],["labour","Labour"],["dawai","Spray"],["spray","Spray"],["dawa","Spray"]];
var CROPS=[["gehu","Wheat"],["gehun","Wheat"],["wheat","Wheat"],["dhaan","Rice"],["dhan","Rice"],["chawal","Rice"],["rice","Rice"],["paddy","Rice"],["ganna","Sugarcane"],["sugarcane","Sugarcane"],["aloo","Veg"],["sabzi","Veg"],["sabji","Veg"],["tamatar","Veg"],["veg","Veg"]];

function normalize(t){
  t=t.toLowerCase().replace(/[०-९]/g,function(c){return DEV[c];});
  Object.keys(DEVWORDS).forEach(function(k){t=t.split(k).join(" "+DEVWORDS[k]+" ");});
  return t.replace(/[₹,.?!]/g," ").replace(/\s+/g," ").trim();
}
function readNumbers(tokens){
  // returns list of {value, start, end}
  var out=[],i=0;
  while(i<tokens.length){
    var tk=tokens[i];
    var isNum=/^\d+(\.\d+)?$/.test(tk)||NUM[tk]!==undefined||["sau","hazaar","hajar","lakh","dhai","derh","sadhe"].indexOf(tk)>=0;
    if(!isNum){i++;continue;}
    var total=0,cur=0,start=i,j=i;
    for(;j<tokens.length;j++){
      var w=tokens[j];
      if(/^\d+(\.\d+)?$/.test(w)){cur+=parseFloat(w);}
      else if(NUM[w]!==undefined){cur+=NUM[w];}
      else if(w==="dhai"){cur=2.5;}
      else if(w==="derh"){cur=1.5;}
      else if(w==="sau"){cur=(cur||1)*100;}
      else if(w==="hazaar"||w==="hajar"){total+=(cur||1)*1000;cur=0;}
      else if(w==="lakh"){total+=(cur||1)*100000;cur=0;}
      else break;
    }
    out.push({value:total+cur,start:start,end:j});
    i=j;
  }
  return out;
}
function parse(text){
  var n=normalize(text), tk=n.split(" "), flags=[];
  var date=new Date(), when="Today";
  if(tk.indexOf("kal")>=0){date.setDate(date.getDate()-1);when="Yesterday";}
  else if(tk.indexOf("parso")>=0){date.setDate(date.getDate()-2);when="2 days ago";}
  var type=null;
  var EXP=["lage","laga","lagi","kharcha","kharch","kharida","kharide","kharidi","diya","diye"];
  var SALE=["becha","beche","bechi","bika","bike","bikri","mila","mile"];
  var HAR=["kata","kati","kate","paida","nikla","nikli","hui","hua","utpadan"];
  tk.forEach(function(w){ if(!type){ if(SALE.indexOf(w)>=0)type="s"; else if(HAR.indexOf(w)>=0)type="h"; else if(EXP.indexOf(w)>=0)type="e"; } });
  var item="",crop="";
  ITEMS.forEach(function(p){if(!item&&tk.indexOf(p[0])>=0)item=p[1];});
  CROPS.forEach(function(p){if(!crop&&tk.indexOf(p[0])>=0)crop=p[1];});
  var nums=readNumbers(tk), qty="", amount=0, rate=false, qtyVal=0;
  // quantity = number followed by unit; amount = number near rupaye
  nums.forEach(function(x){
    var next=tk[x.end]||"", prev=tk[x.start-1]||"";
    if(UNITS[next]&&!qty){qty=x.value+" "+UNITS[next];qtyVal=x.value;x.used="qty";}
  });
  nums.forEach(function(x){
    if(x.used)return;
    var next=tk[x.end]||"", after=tk[x.end+1]||"";
    if(["rupaye","rupay","rs","rupees","rupiya"].indexOf(next)>=0||!amount){
      if(!amount||["rupaye","rupay","rs","rupees","rupiya"].indexOf(next)>=0){amount=x.value;if(UNITS[after]||tk.indexOf("per")>=0||tk.indexOf("prati")>=0)rate=true;}
    }
  });
  if(rate&&qtyVal){amount=amount*qtyVal;}
  if(type==="h"){ if(!item)item=(crop||"Crop")+" harvest"; }
  if(type==="s"&&!item){item=(crop||"Produce")+" sold";}
  if(type==="s"&&item&&item.indexOf("sold")<0&&crop){item=crop+" sold";}
  var conf=0.97;
  if(!type){flags.push("Could not tell if this is an expense, sale or harvest");conf-=0.25;}
  if(type!=="h"&&!amount){flags.push("No amount heard");conf-=0.3;}
  if(type==="e"&&!item){item="Other expense";flags.push("Item not recognised");conf-=0.12;}
  if(!crop){crop=type==="e"&&(item==="Labour"||item==="Water / diesel")?"General":"General";}
  return {ok:!!type&&(type==="h"||amount>0),type:type||"e",item:item,crop:crop,amount:amount,qty:qty,date:iso(date),when:when,flags:flags,conf:Math.max(.4,conf),heard:text};
}

if (typeof module !== "undefined") { module.exports = { parse: parse, normalize: normalize, readNumbers: readNumbers }; }
