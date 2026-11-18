import * as THREE from 'three';
import { materials as m } from './materiales.js';

const add=(g,w,h,d,mat,x,y,z,cast=true)=>{
 const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);
 o.position.set(x,y,z);o.castShadow=cast;o.receiveShadow=true;g.add(o);return o;
};
const cylinder=(g,rTop,rBottom,h,mat,x,y,z,segments=20)=>{
 const o=new THREE.Mesh(new THREE.CylinderGeometry(rTop,rBottom,h,segments),mat);
 o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;g.add(o);return o;
};

const screens = new Map();

function drawStation(screen, station) {
 const { texture, id } = screen;
 const ctx = texture.image.getContext('2d');
 ctx.fillStyle = '#102640';
 ctx.fillRect(0, 0, 512, 288);
 ctx.fillStyle = station ? '#65e6bd' : '#80baff';
 ctx.fillRect(0, 0, 512, 8);
 ctx.font = 'bold 32px Arial';
 ctx.fillText('SENATI  /  PC ' + String(id).padStart(2, '0'), 24, 60);
 ctx.fillStyle = '#ffffff';
 ctx.font = 'bold 45px Arial';
 ctx.fillText(station?.name ?? 'Puesto libre', 24, 137, 464);
 ctx.fillStyle = '#c7e3ff';
 ctx.font = '28px monospace';
 ctx.fillText(station ? 'IP  ' + station.ip : 'Clic para configurar', 24, 200, 464);
 if (station) ctx.fillText('MAC ' + station.mac, 24, 250, 464);
 texture.needsUpdate = true;
 screen.station = station;
}

function stationTexture(id) {
 if (!screens.has(id)) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 288;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const screen = { id, texture };
  drawStation(screen, null);
  screens.set(id, screen);
 }
 return screens.get(id).texture;
}

export function updateStationScreens(stations) {
 for (const screen of screens.values()) {
  const before = screen.station;
  const after = stations[screen.id];
  if (before?.name !== after?.name || before?.ip !== after?.ip || before?.mac !== after?.mac) {
   drawStation(screen, after);
  }
 }
}

function createSwivelChair(g,x,z){
 // Silla ergonómica negra con respaldo, pistón y base de cinco radios con ruedas.
 const black=m.chair,metal=m.chairLeg;
 const seat=new THREE.Mesh(new THREE.BoxGeometry(.52,.12,.52),black);
 seat.position.set(x,.56,z);seat.castShadow=true;seat.receiveShadow=true;g.add(seat);
 const back=new THREE.Mesh(new THREE.BoxGeometry(.09,.57,.49),black);
 back.position.set(x-.22,.88,z);back.rotation.z=-.08;
 back.castShadow=true;back.receiveShadow=true;g.add(back);
 // Cojín de respaldo ligeramente más claro para dar volumen.
 const lumbar=new THREE.Mesh(new THREE.BoxGeometry(.025,.20,.35),new THREE.MeshStandardMaterial({color:0x252a31,roughness:.9}));
 lumbar.position.set(x-.272,.83,z);g.add(lumbar);
 cylinder(g,.075,.09,.34,metal,x,.31,z,20);
 cylinder(g,.26,.26,.065,metal,x,.15,z,24);
 for(let i=0;i<5;i++){
  const a=i*Math.PI*2/5;
  const dx=Math.cos(a),dz=Math.sin(a);
  const spoke=new THREE.Mesh(new THREE.BoxGeometry(.48,.045,.055),metal);
  spoke.position.set(x+dx*.25,.105,z+dz*.25);
  spoke.rotation.y=-a;spoke.castShadow=true;g.add(spoke);
  cylinder(g,.065,.065,.085,metal,x+dx*.49,.065,z+dz*.49,14);
 }
}

function createKeyboardAndMouse(g,x,z,top){
 const keyboardX=x-.52;
 // Teclado negro de tamaño estándar, con teclas separadas visibles.
 add(g,.17,.025,.48,m.chairLeg,keyboardX,top+.085,z,false);
 const keyMat=new THREE.MeshStandardMaterial({color:0xcbd2d9,roughness:.72});
 for(let row=0;row<4;row++){
  const count=row===3?10:13;
  for(let k=0;k<count;k++){
   const zz=z-.205+k*(.41/(count-1));
   add(g,.028,.009,.022,keyMat,keyboardX-.055+row*.037,top+.103,zz,false);
  }
 }
 // Mouse óptico con rueda central, colocado a la derecha del teclado.
 const mouse=new THREE.Mesh(new THREE.SphereGeometry(1,16,12),new THREE.MeshStandardMaterial({color:0x202832,roughness:.42}));
 mouse.scale.set(.055,.022,.078);
 mouse.position.set(keyboardX-.005,top+.102,z+.36);
 mouse.castShadow=true;g.add(mouse);
 const wheel=add(g,.012,.008,.025,m.metal,keyboardX-.005,top+.124,z+.36,false);
 return {keyboardX,mouse};
}

function create23InchMonitor(g,x,z,top,stationId){
 // Diagonal aproximada de 23 pulgadas, formato panorámico 16:9 (50.9 × 28.6 cm).
 const monitorX=x+.49;
 const centerY=top+.39;
 // Soporte y base de escritorio.
 add(g,.28,.035,.22,m.metal,monitorX-.04,top+.105,z,false);
 add(g,.065,.22,.065,m.metal,monitorX,top+.235,z,false);
 // Marco del monitor, con bisel delgado.
 const bezel=new THREE.Mesh(new THREE.BoxGeometry(.055,.325,.555),new THREE.MeshStandardMaterial({color:0x111820,metalness:.22,roughness:.34}));
 bezel.userData.stationId=stationId;
 bezel.position.set(monitorX,centerY,z);bezel.castShadow=true;bezel.receiveShadow=true;g.add(bezel);
 // Superficie de pantalla orientada hacia el estudiante (hacia -X).
 const display=new THREE.Mesh(
  new THREE.PlaneGeometry(.515,.29),
  new THREE.MeshBasicMaterial({map:stationTexture(stationId),toneMapped:false})
 );
 display.rotation.y=-Math.PI/2;
 display.position.set(monitorX-.029,centerY,z);
 display.userData.stationId=stationId;
 display.renderOrder=2;g.add(display);
 // Cámara frontal discreta.
 add(g,.018,.018,.018,m.metal,monitorX-.031,centerY+.158,z,false);
}

function individualDesk(g,x,z,stationWidth,stationId){
 const top=.84,depth=1.58,width=stationWidth;
 // Escritorios individuales contiguos, sin mamparas ni divisiones.
 const desktop=add(g,depth,.12,width,m.desk,x,top,z);
 desktop.userData.stationId=stationId;
 add(g,depth+.025,.035,width+.012,m.deskEdge,x,top-.075,z);
 // Patas cuadradas de metal, retiradas de los bordes para dejar juntas limpias.
 for(const dx of [-depth/2+.09,depth/2-.09]){
  for(const dz of [-width/2+.09,width/2-.09]){
   add(g,.055,.78,.055,m.chairLeg,x+dx,.39,z+dz);
  }
 }
 create23InchMonitor(g,x,z,top,stationId);
 createKeyboardAndMouse(g,x,z,top);
 // La silla queda delante del monitor y mira hacia +X.
 createSwivelChair(g,x-depth/2-.36,z);
}

function workstationRow(g,{x,z,length,count,firstId}){
 const stationWidth=length/count;
 for(let i=0;i<count;i++){
  const deskZ=z-length/2+stationWidth*(i+.5);
  individualDesk(g,x,deskZ,stationWidth,firstId+i);
 }
}

export function crearMobiliario(group){
 // Se conserva la distribución aprobada: cuatro filas superiores y cuatro inferiores.
 const xs=[-6.7,-2.7,1.3,5.3];
 xs.forEach((x,i)=>workstationRow(group,{x,z:-3.0,length:4.65,count:4,firstId:1+i*4}));
 xs.forEach((x,i)=>workstationRow(group,{x,z:3.65,length:3.25,count:2,firstId:17+i*2}));
}

export function crearPizarra(group){
 const x=9.72,y=1.95,z=.25;
 add(group,.12,1.55,3.25,m.boardFrame,x,y,z);
 add(group,.05,1.43,3.12,m.board,x-.075,y,z);
 // Diapositiva institucional tipo PowerPoint proyectada sobre la pizarra.
 const canvas=document.createElement('canvas');canvas.width=1280;canvas.height=720;
 const ctx=canvas.getContext('2d');
 const grad=ctx.createLinearGradient(0,0,1280,720);
 grad.addColorStop(0,'#08264b');grad.addColorStop(1,'#1265a5');
 ctx.fillStyle=grad;ctx.fillRect(0,0,1280,720);
 ctx.fillStyle='#28b8df';ctx.fillRect(0,0,1280,20);
 ctx.fillStyle='#fff';ctx.font='bold 92px Arial';ctx.fillText('SENATI',90,160);
 ctx.fillStyle='#d8edff';ctx.font='bold 48px Arial';ctx.fillText('LABORATORIO DE INFORMÁTICA',90,270);
 ctx.fillStyle='#fff';ctx.font='38px Arial';
 ctx.fillText('Tecnologías de la información',100,390);
 ctx.fillText('Aprendizaje práctico e innovación',100,465);
 ctx.fillText('Desarrollo de competencias digitales',100,540);
 ctx.fillStyle='#52c5e7';ctx.fillRect(90,600,1080,5);
 ctx.fillStyle='#cfe4f5';ctx.font='25px Arial';ctx.fillText('FORMACIÓN TECNOLÓGICA',90,655);
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
 const slide=new THREE.Mesh(new THREE.PlaneGeometry(3.02,1.70),new THREE.MeshBasicMaterial({map:texture}));
 slide.rotation.y=-Math.PI/2;
 slide.position.set(x-.105,y,z);slide.renderOrder=3;group.add(slide);
 add(group,.17,.06,3.3,m.boardFrame,x-.05,1.16,z);
 add(group,.18,.045,.75,m.metal,x-.08,1.12,z-1.0);
}
