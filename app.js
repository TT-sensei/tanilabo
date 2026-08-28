(function(){
  "use strict";
  const MODES={
    unit:{name:"ぴったり単位",icon:"📏",desc:"数とものに合う単位を選ぶ",color:"#0f766e"},
    conversion:{name:"単位チェンジ",icon:"🔄",desc:"mm・cm・m・kmを変換する",color:"#2563a8"},
    repair:{name:"データ修理",icon:"🛠️",desc:"変な単位を見つけて直す",color:"#d56b28"},
    compare:{name:"そろえてくらべる",icon:"⚖️",desc:"単位をそろえて大小を比べる",color:"#7c4ab0"},
    decimal:{name:"小数研究",icon:"🔬",desc:"複名数と小数を行き来する",color:"#bd3e67"}
  };
  const BADGES=[
    {id:"start",emoji:"🥉",name:"長さ研究スタート",desc:"はじめて10問を研究する"},
    {id:"unit",emoji:"📏",name:"ぴったり単位名人",desc:"ぴったり単位をクリア"},
    {id:"conversion",emoji:"🔄",name:"単位チェンジ名人",desc:"単位チェンジをクリア"},
    {id:"repair",emoji:"🛠️",name:"データ修理名人",desc:"データ修理をクリア"},
    {id:"compare",emoji:"⚖️",name:"くらべる名人",desc:"そろえてくらべるをクリア"},
    {id:"decimal",emoji:"🔬",name:"小数研究員",desc:"小数研究をクリア"},
    {id:"master",emoji:"🏆",name:"長さラボマスター",desc:"5つの研究をすべてクリア"}
  ];
  const KEY="unitLab-length-v1";
  const defaults={xp:0,total:0,correct:0,plays:0,seen:[],weak:[],badges:[],modeStats:{},best:{}};
  let saved=load();
  let session=null;
  const $=s=>document.querySelector(s);
  const $$=s=>[...document.querySelectorAll(s)];

  function load(){try{return {...defaults,...JSON.parse(localStorage.getItem(KEY)||"{}")};}catch{return {...defaults};}}
  function save(){localStorage.setItem(KEY,JSON.stringify(saved));updateHeader();}
  function updateHeader(){
    $("#xpValue").textContent=saved.xp;
    $("#badgeCount").textContent=saved.badges.length;
    $("#totalRecord").textContent=`学習 ${saved.total}問　正解 ${saved.correct}問`;
    const n=saved.weak.length; $("#trainingText").textContent=n?`苦手問題が ${n}問 あります。時間制限なしで練習できます。`:"まちがえた問題がここに集まります。";
    $("#trainingBtn").disabled=!n;
  }
  function show(id){$$('.screen').forEach(x=>x.classList.toggle('active',x.id===id));window.scrollTo({top:0,behavior:"smooth"});}
  function renderModes(){
    $("#modeGrid").innerHTML=Object.entries(MODES).map(([id,m])=>{const s=saved.modeStats[id]||{plays:0,correct:0,total:0};return `<button class="mode-card" data-mode="${id}" style="--mode:${m.color}"><span class="mode-icon">${m.icon}</span><h3>${m.name}</h3><p>${m.desc}</p><small>${s.plays?`${s.plays}回クリア・正解 ${s.correct}/${s.total}`:"まだ研究していません"}</small></button>`}).join("");
    $$('.mode-card').forEach(b=>b.addEventListener('click',()=>start(b.dataset.mode,false)));
  }
  function renderBadges(){
    $("#badgeGrid").innerHTML=BADGES.map(b=>`<article class="badge-card ${saved.badges.includes(b.id)?"earned":""}"><div class="badge-emoji">${saved.badges.includes(b.id)?b.emoji:"🔒"}</div><h3>${b.name}</h3><p>${b.desc}</p></article>`).join("");
  }
  function chooseQuestions(mode){
    const list=[...LAB_DATA[mode]];
    const seen=new Set(saved.seen), weak=new Set(saved.weak);
    list.sort((a,b)=>score(b)-score(a)||Math.random()-.5);
    function score(q){return(!seen.has(q.id)?4:0)+(weak.has(q.id)?2:0)+Math.random();}
    return list.slice(0,10);
  }
  function getAllQuestions(){return Object.values(LAB_DATA).flat();}
  function start(mode,training){
    let questions;
    if(training){questions=getAllQuestions().filter(q=>saved.weak.includes(q.id)); if(!questions.length)return; shuffle(questions);}
    else questions=chooseQuestions(mode);
    session={mode,training,questions,index:0,correct:0,answered:false,lastMode:mode};
    $("#stopTraining").hidden=!training;
    show("playScreen");renderQuestion();
  }
  function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
  function current(){return session.questions[session.index%session.questions.length];}
  function renderQuestion(){
    const q=current(), m=MODES[q.mode];session.answered=false;session.repairStage=1;
    $("#playMode").textContent=session.training?`苦手特訓・${m.name}`:m.name;
    $("#progressText").textContent=session.training?`特訓 ${session.index+1}問目`:`${session.index+1} / ${session.questions.length}`;
    $("#progressBar").style.width=session.training?`${Math.min(100,((session.index%10)+1)*10)}%`:`${(session.index+1)/session.questions.length*100}%`;
    $("#sceneIcon").textContent=m.icon;$("#instruction").textContent=q.instruction;$("#questionText").textContent=q.question;
    $("#feedback").className="feedback";$("#feedback").textContent="";$("#sessionScore").textContent=`正解 ${session.correct}`;
    if(q.mode==="repair")renderChoices([{v:"odd",t:"おかしい"},{v:"ok",t:"おかしくない"}],repairJudge);
    else if(q.choices)renderChoices(q.choices.map(v=>({v:v==="＝"?"=":v,t:v})),(v,b)=>answer(q,v,b));
    else renderInputs(q);
  }
  function renderChoices(items,fn){
    $("#answerArea").innerHTML=items.map(x=>`<button class="choice" data-value="${x.v}">${x.t}</button>`).join("");
    $$('.choice').forEach(b=>b.addEventListener('click',()=>fn(b.dataset.value,b)));
  }
  function renderInputs(q){
    const inputs=q.answers.map((_,i)=>`<label><span>${q.answers.length>1?i+1:""}</span><input inputmode="decimal" aria-label="${i+1}つ目の答え" autocomplete="off"></label>`).join("");
    $("#answerArea").innerHTML=inputs+`<button class="primary submit">決定</button>`;
    $('.submit').addEventListener('click',()=>{const vals=$$('#answerArea input').map(x=>numberValue(x.value));if(vals.some(Number.isNaN)){pulse($('#answerArea'));return;}answer(q,vals)});
    $$('#answerArea input').forEach((x,i)=>x.addEventListener('keydown',e=>{if(e.key==='Enter'){if(i<q.answers.length-1)$$('#answerArea input')[i+1].focus();else $('.submit').click();}}));
    $('#answerArea input')?.focus();
  }
  function numberValue(v){return Number(v.trim().replace(/[０-９．]/g,c=>"０１２３４５６７８９．".indexOf(c)===10?".":String("０１２３４５６７８９".indexOf(c))).replace(',','.'));}
  function repairJudge(v,btn){
    if(session.answered)return;const q=current(),ok=(v==="odd")===q.isOdd;
    if(!ok){finishAnswer(false,btn,q,`もう一度、ものの大きさを思いうかべよう。${q.explain}`);return;}
    btn.classList.add('correct');
    if(!q.isOdd){finishAnswer(true,btn,q,q.explain);return;}
    session.repairStage=2;$("#instruction").textContent="数字はそのまま。どの単位に直す？";
    renderChoices(["mm","cm","m","km"].map(x=>({v:x,t:x})),(unit,el)=>answer(q,unit,el));
  }
  function answer(q,value,button){
    if(session.answered)return;let ok;
    if(q.mode==="repair")ok=value===q.answer;
    else if(q.choices)ok=value===q.answer;
    else ok=q.answers.every((x,i)=>Math.abs(x-value[i])<1e-9);
    finishAnswer(ok,button,q,ok?q.explain:`正しくは「${formatAnswer(q)}」。${q.explain}`);
  }
  function formatAnswer(q){if(q.mode==="repair")return `${q.value}${q.answer}`;if(q.choices)return q.answer;if(q.answers)return q.answers.join("、");return q.answer;}
  function finishAnswer(ok,button,q,message){
    session.answered=true;
    $$('#answerArea button,#answerArea input').forEach(x=>x.disabled=true);
    if(button)button.classList.add(ok?'correct':'wrong');
    const fb=$("#feedback");fb.className=`feedback ${ok?'good':'bad'}`;fb.innerHTML=`${ok?'できた！ 単位までよく見たね。':'おしい！'}<br><small>${message}</small><br><button class="primary next-btn">${session.training?'つぎの特訓へ':session.index===session.questions.length-1?'結果を見る':'つぎの問題'}</button>`;
    pulse(fb);session.correct+=ok?1:0;recordQuestion(q,ok);$("#sessionScore").textContent=`正解 ${session.correct}`;
    $('.next-btn').addEventListener('click',next);
  }
  function recordQuestion(q,ok){
    if(!saved.seen.includes(q.id))saved.seen.push(q.id);
    if(ok){saved.correct++;if(session.training)saved.weak=saved.weak.filter(x=>x!==q.id);}
    else if(!saved.weak.includes(q.id))saved.weak.push(q.id);
    saved.total++;save();
  }
  function next(){
    session.index++;
    if(session.training){
      const remaining=session.questions.filter(q=>saved.weak.includes(q.id));
      if(!remaining.length){finishTraining();return;}
      session.questions=remaining;session.index=session.index%remaining.length;renderQuestion();return;
    }
    if(session.index>=session.questions.length)finishSession();else renderQuestion();
  }
  function finishTraining(){
    session.training=false;$("#resultTitle").textContent="苦手特訓 完了！";$("#resultMedal").textContent="🎯";
    $("#resultScore").textContent=`${session.correct}問`;$("#resultRate").textContent="克服！";$("#resultXp").textContent=`+${session.correct*5}`;
    saved.xp+=session.correct*5;save();$("#resultMessage").textContent="苦手問題がなくなりました。よくねばり強く研究したね！";$("#newBadge").hidden=true;show("resultScreen");
  }
  function finishSession(){
    const mode=session.mode,total=session.questions.length,rate=Math.round(session.correct/total*100),xp=session.correct*10+(session.correct===10?30:0),newOnes=[];
    saved.xp+=xp;saved.plays++;saved.modeStats[mode]=saved.modeStats[mode]||{plays:0,correct:0,total:0};saved.modeStats[mode].plays++;saved.modeStats[mode].correct+=session.correct;saved.modeStats[mode].total+=total;saved.best[mode]=Math.max(saved.best[mode]||0,session.correct);
    award("start",newOnes);if(session.correct>=7)award(mode,newOnes);if(Object.keys(MODES).every(m=>saved.badges.includes(m)))award("master",newOnes);save();
    $("#resultTitle").textContent=`${MODES[mode].name} 研究完了！`;$("#resultMedal").textContent=rate===100?"🏆":rate>=70?"🥇":"🔬";$("#resultScore").textContent=`${session.correct} / ${total}`;$("#resultRate").textContent=`${rate}%`;$("#resultXp").textContent=`+${xp}`;
    $("#resultMessage").textContent=rate===100?"全問正解！ 数字と単位をセットで見られています。":rate>=70?"いい研究でした。まちがえた問題は特訓で確かめよう。":"単位一覧を見ながらで大丈夫。ものの大きさを思いうかべよう。";
    const nb=$("#newBadge");if(newOnes.length){nb.hidden=false;nb.innerHTML=`<b>新しいバッジ！</b><br>${newOnes.map(id=>{const b=BADGES.find(x=>x.id===id);return `${b.emoji} ${b.name}`}).join("<br>")}`;}else nb.hidden=true;
    show("resultScreen");
  }
  function award(id,list){if(!saved.badges.includes(id)){saved.badges.push(id);list.push(id);}}
  function pulse(el){el.classList.remove('pop');void el.offsetWidth;el.classList.add('pop');}
  function goHome(){renderModes();updateHeader();show("homeScreen");}

  $$('.hint-open').forEach(b=>b.addEventListener('click',()=>$('#hintDialog').showModal()));
  $('#hintClose').addEventListener('click',()=>$('#hintDialog').close());
  $('#hintDialog').addEventListener('click',e=>{if(e.target===$('#hintDialog'))$('#hintDialog').close();});
  $('#homeBtn').addEventListener('click',goHome);$('#quitBtn').addEventListener('click',goHome);$('#stopTraining').addEventListener('click',goHome);$('#resultHomeBtn').addEventListener('click',goHome);$('#badgeBackBtn').addEventListener('click',goHome);
  $('#badgeBtn').addEventListener('click',()=>{renderBadges();show('badgeScreen')});
  $('#trainingBtn').addEventListener('click',()=>start(null,true));
  $('#resumeBtn').addEventListener('click',()=>{const next=Object.keys(MODES).find(m=>!(saved.modeStats[m]?.plays))||Object.keys(MODES).sort((a,b)=>(saved.best[a]||0)-(saved.best[b]||0))[0];start(next,false)});
  $('#retryBtn').addEventListener('click',()=>start(session.lastMode||'unit',false));
  renderModes();updateHeader();
})();
