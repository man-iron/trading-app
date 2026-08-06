import{j as r}from"./jsx-runtime-DCCOt0jE.js";import{r as I}from"./index-BeMkoiPZ.js";import{c as w}from"./react-jss.esm-DWlgvxJf.js";import{f as L,b as O}from"./renderWithProviders-qBe5KPgf.js";import{T as F,m as W,j as B,c}from"./reportConstants-DRLxDv27.js";import{a as D}from"./theming.esm-DukwDhwJ.js";import"./test-utils-B0vCVEds.js";import"./index-X6M-XfAm.js";import"./client-9aDo3Kim.js";import"./rootReducer-C9MekMYR.js";const C=e=>({root:{display:"flex",alignItems:"center",justifyContent:"space-between",gap:e.spacing.unit*2,height:28,padding:[0,e.spacing.unit+2],backgroundColor:e.colors.panelRaised,borderTop:`1px solid ${e.colors.border}`,color:e.colors.textSecondary,fontFamily:e.fonts.mono,fontSize:11,letterSpacing:"0.04em",whiteSpace:"nowrap",userSelect:"none",flexShrink:0},section:{display:"flex",alignItems:"center",gap:e.spacing.unit,minWidth:0,overflow:"hidden",textOverflow:"ellipsis"},userName:{color:e.colors.text,fontWeight:700},separator:{color:e.colors.border},fieldLabel:{color:e.colors.textSecondary,opacity:.75},reportLabel:{color:e.colors.accent,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",overflow:"hidden",textOverflow:"ellipsis"},placeholder:{color:e.colors.textSecondary,fontStyle:"italic"},clock:{color:e.colors.up,fontWeight:700,fontVariantNumeric:"tabular-nums",letterSpacing:"0.08em"}}),l=e=>String(e).padStart(2,"0"),E=e=>`${l(e.getHours())}:${l(e.getMinutes())}:${l(e.getSeconds())}`;class R extends I.Component{constructor(s){super(s),this.state={now:new Date},this.intervalId=null,this.handleTick=this.handleTick.bind(this)}componentDidMount(){this.intervalId=setInterval(this.handleTick,1e3)}componentWillUnmount(){this.intervalId!==null&&(clearInterval(this.intervalId),this.intervalId=null)}handleTick(){this.setState({now:new Date})}renderUserSection(){const{classes:s,user:t}=this.props;return t?r.jsxs(r.Fragment,{children:[r.jsx("span",{className:s.userName,children:t.name}),r.jsx("span",{className:s.separator,children:"//"}),r.jsx("span",{children:t.desk}),r.jsx("span",{className:s.separator,children:"//"}),r.jsx("span",{children:t.role})]}):r.jsx("span",{className:s.placeholder,children:"NOT SIGNED IN"})}renderReportSection(){const{classes:s,selectedReportLabel:t}=this.props;return r.jsxs(r.Fragment,{children:[r.jsx("span",{className:s.fieldLabel,children:"RPT"}),t?r.jsx("span",{className:s.reportLabel,children:t}):r.jsx("span",{className:s.placeholder,children:"NO REPORT"})]})}render(){const{classes:s}=this.props,{now:t}=this.state;return r.jsxs("footer",{className:s.root,"data-testid":"status-bar",children:[r.jsx("div",{className:s.section,children:this.renderUserSection()}),r.jsx("div",{className:s.section,children:this.renderReportSection()}),r.jsx("div",{className:s.section,children:r.jsx("time",{className:s.clock,"data-testid":"status-clock",children:E(t)})})]})}}const $=w(C)(R);R.__docgenInfo={description:`StatusBar — retro class-based bottom status strip.

Shows (left to right): the signed-in user's name / desk / role, the
currently selected report label, and a live local-time clock. The clock is
driven by the classic retro pattern: an interval started in
\`componentDidMount\`, ticking local state every second, cleared in
\`componentWillUnmount\`.

@class StatusBar

Props:
@property {Object} classes
  JSS classes injected by \`withStyles(styles)\` (StatusBar.styles.js).
@property {import('../../types').UserData|null} [user]
  The signed-in user; renders a "NOT SIGNED IN" placeholder when absent.
@property {string|null} [selectedReportLabel]
  Label of the currently selected report; renders "NO REPORT" when absent.`,methods:[{name:"handleTick",docblock:"Advance the clock to the current time.",modifiers:[],params:[],returns:null,description:"Advance the clock to the current time."},{name:"renderUserSection",docblock:null,modifiers:[],params:[],returns:null},{name:"renderReportSection",docblock:null,modifiers:[],params:[],returns:null}],displayName:"StatusBar"};const T={id:"u1",name:"Ada Trader",role:"Senior Trader",email:"ada@example.com",desk:"FX Desk",preferences:{theme:"dark",defaultReportId:"fx-spot"}};var i;const P=((i=L(O(),"fx-spot"))==null?void 0:i.label)??"FX Spot",q={title:"Components/StatusBar",component:$,decorators:[e=>r.jsx(F,{theme:W,children:r.jsx(D,{theme:B,children:r.jsx("div",{style:{width:720,backgroundColor:c.background,border:`1px solid ${c.border}`},children:r.jsx(e,{})})})})]},o={args:{user:T,selectedReportLabel:P}},n={args:{user:T,selectedReportLabel:null}},a={args:{user:null,selectedReportLabel:null}};var d,p,u,m,h;o.parameters={...o.parameters,docs:{...(d=o.parameters)==null?void 0:d.docs,source:{originalSource:`{
  args: {
    user: userFixture,
    selectedReportLabel: fxSpotLabel
  }
}`,...(u=(p=o.parameters)==null?void 0:p.docs)==null?void 0:u.source},description:{story:"Signed-in user with a selected report — the common app state.",...(h=(m=o.parameters)==null?void 0:m.docs)==null?void 0:h.description}}};var S,g,x,f,b;n.parameters={...n.parameters,docs:{...(S=n.parameters)==null?void 0:S.docs,source:{originalSource:`{
  args: {
    user: userFixture,
    selectedReportLabel: null
  }
}`,...(x=(g=n.parameters)==null?void 0:g.docs)==null?void 0:x.source},description:{story:"Signed-in user, nothing selected yet.",...(b=(f=n.parameters)==null?void 0:f.docs)==null?void 0:b.description}}};var y,j,N,k,v;a.parameters={...a.parameters,docs:{...(y=a.parameters)==null?void 0:y.docs,source:{originalSource:`{
  args: {
    user: null,
    selectedReportLabel: null
  }
}`,...(N=(j=a.parameters)==null?void 0:j.docs)==null?void 0:N.source},description:{story:"Cold start: no user, no report — placeholders everywhere.",...(v=(k=a.parameters)==null?void 0:k.docs)==null?void 0:v.description}}};const K=["SignedInWithReport","SignedInNoReport","SignedOut"];export{n as SignedInNoReport,o as SignedInWithReport,a as SignedOut,K as __namedExportsOrder,q as default};
