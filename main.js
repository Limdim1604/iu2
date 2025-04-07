// =================== THIẾT LẬP CÁC BIẾN TOÀN CỤC ===================
// Thay đổi các biến toàn cục tại đây:
var radius = 240; // Bán kính vòng tròn
var autoRotate = true; // Tự động quay hay không
var rotateSpeed = -60; // Đơn vị: giây/360 độ
var imgWidth = 120; // Chiều rộng ảnh (px)
var imgHeight = 170; // Chiều cao ảnh (px)

// Link nhạc nền từ GitHub - đặt 'null' nếu không muốn phát nhạc nền
var bgMusicURL ='https://raw.githubusercontent.com/Limdim1604/iu2/main/mai_mai_ben_nhau.mp3';
var bgMusicControls = true; // Hiển thị thanh điều khiển nhạc

// =================== KHỞI TẠO ===================
setTimeout(init, 1000);

var odrag = document.getElementById('drag-container');
var ospin = document.getElementById('spin-container');
var aImg = ospin.getElementsByTagName('img');
var aVid = ospin.getElementsByTagName('video');
var aEle = [...aImg, ...aVid]; // Kết hợp 2 mảng

// Cài đặt kích thước cho container ảnh
ospin.style.width = imgWidth + "px";
ospin.style.height = imgHeight + "px";

// Cài đặt kích thước cho phần ground dựa trên bán kính
var ground = document.getElementById('ground');
ground.style.width = radius * 3 + "px";
ground.style.height = radius * 3 + "px";

// Hàm khởi tạo sắp xếp vị trí các phần tử xung quanh vòng tròn
function init(delayTime) {
  for (var i = 0; i < aEle.length; i++) {
    aEle[i].style.transform = "rotateY(" + (i * (360 / aEle.length)) + "deg) translateZ(" + radius + "px)";
    aEle[i].style.transition = "transform 1s";
    aEle[i].style.transitionDelay = delayTime || (aEle.length - i) / 4 + "s";
  }
}

// Hàm áp dụng biến đổi (transform) dựa trên góc xoay
function applyTranform(obj) {
  // Giới hạn góc quay của camera (0 đến 180 độ)
  if(tY > 180) tY = 180;
  if(tY < 0) tY = 0;
  obj.style.transform = "rotateX(" + (-tY) + "deg) rotateY(" + (tX) + "deg)";
}

// Hàm điều khiển quay
function playSpin(yes) {
  ospin.style.animationPlayState = (yes ? 'running' : 'paused');
}

var sX, sY, nX, nY, desX = 0, desY = 0, tX = 0, tY = 10;

// Nếu autoRotate được bật, áp dụng hiệu ứng quay
if (autoRotate) {
  var animationName = (rotateSpeed > 0 ? 'spin' : 'spinRevert');
  ospin.style.animation = `${animationName} ${Math.abs(rotateSpeed)}s infinite linear`;
}

// =================== THÊM NHẠC NỀN ===================
// Sử dụng thẻ audio để tự động phát nhạc
if (bgMusicURL) {
  var musicContainer = document.getElementById('music-container');
  musicContainer.innerHTML += `<audio id="bg-audio" src="${bgMusicURL}" autoplay ${bgMusicControls ? 'controls' : ''} loop></audio>`;
}

// =================== XỬ LÝ SỰ KIỆN VỚI CON TRỎ ===================

document.onpointerdown = function (e) {
  clearInterval(odrag.timer);
  e = e || window.event;
  var sX = e.clientX,
      sY = e.clientY;

  this.onpointermove = function (e) {
    e = e || window.event;
    var nX = e.clientX,
        nY = e.clientY;
    desX = nX - sX;
    desY = nY - sY;
    tX += desX * 0.1;
    tY += desY * 0.1;
    applyTranform(odrag);
    sX = nX;
    sY = nY;
  };

  this.onpointerup = function (e) {
    odrag.timer = setInterval(function () {
      desX *= 0.95;
      desY *= 0.95;
      tX += desX * 0.1;
      tY += desY * 0.1;
      applyTranform(odrag);
      playSpin(false);
      if (Math.abs(desX) < 0.5 && Math.abs(desY) < 0.5) {
        clearInterval(odrag.timer);
        playSpin(true);
      }
    }, 17);
    this.onpointermove = this.onpointerup = null;
  };

  return false;
};

// Sự kiện thay đổi bán kính khi cuộn chuột
document.onmousewheel = function(e) {
  e = e || window.event;
  var d = e.wheelDelta / 20 || -e.detail;
  radius += d;
  init(1);
};

// =================== PHẦN WEBGL VÀ SHADER ===================

var canvas = document.getElementById("canvas");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Khởi tạo ngữ cảnh WebGL
var gl = canvas.getContext('webgl');
if (!gl) {
  console.error("Không thể khởi tạo WebGL.");
}

// Thời gian để animation shader
var time = 0.0;

//************** Nguồn shader **************
var vertexSource = `
attribute vec2 position;
void main() {
	gl_Position = vec4(position, 0.0, 1.0);
}
`;

var fragmentSource = `
precision highp float;

uniform float width;
uniform float height;
vec2 resolution = vec2(width, height);

uniform float time;

#define POINT_COUNT 8

vec2 points[POINT_COUNT];
const float speed = -0.5;
const float len = 0.25;
float intensity = 1.3;
float radius = 0.008;

// Hàm tính khoảng cách điểm đến đường cong bezier bậc hai
float sdBezier(vec2 pos, vec2 A, vec2 B, vec2 C){    
	vec2 a = B - A;
	vec2 b = A - 2.0*B + C;
	vec2 c = a * 2.0;
	vec2 d = A - pos;

	float kk = 1.0 / dot(b,b);
	float kx = kk * dot(a,b);
	float ky = kk * (2.0*dot(a,a)+dot(d,b)) / 3.0;
	float kz = kk * dot(d,a);      

	float res = 0.0;

	float p = ky - kx*kx;
	float p3 = p*p*p;
	float q = kx*(2.0*kx*kx - 3.0*ky) + kz;
	float h = q*q + 4.0*p3;

	if(h >= 0.0){ 
		h = sqrt(h);
		vec2 x = (vec2(h, -h) - q) / 2.0;
		vec2 uv = sign(x)*pow(abs(x), vec2(1.0/3.0));
		float t = uv.x + uv.y - kx;
		t = clamp( t, 0.0, 1.0 );

		vec2 qos = d + (c + b*t)*t;
		res = length(qos);
	}else{
		float z = sqrt(-p);
		float v = acos( q/(p*z*2.0) ) / 3.0;
		float m = cos(v);
		float n = sin(v)*1.732050808;
		vec3 t = vec3(m + m, -n - m, n - m) * z - kx;
		t = clamp( t, 0.0, 1.0 );

		vec2 qos = d + (c + b*t.x)*t.x;
		float dis = dot(qos,qos);
        
		res = dis;

		qos = d + (c + b*t.y)*t.y;
		dis = dot(qos,qos);
		res = min(res,dis);
		
		qos = d + (c + b*t.z)*t.z;
		dis = dot(qos,qos);
		res = min(res,dis);

		res = sqrt( res );
	}
    
	return res;
}

// Hàm tính vị trí theo đường cong tim
vec2 getHeartPosition(float t){
	return vec2(16.0 * sin(t) * sin(t) * sin(t),
							-(13.0 * cos(t) - 5.0 * cos(2.0*t)
							- 2.0 * cos(3.0*t) - cos(4.0*t)));
}

// Hàm tạo hiệu ứng phát sáng
float getGlow(float dist, float radius, float intensity){
	return pow(radius/dist, intensity);
}

// Hàm tính đoạn đường cong
float getSegment(float t, vec2 pos, float offset, float scale){
	for(int i = 0; i < POINT_COUNT; i++){
		points[i] = getHeartPosition(offset + float(i)*len + fract(speed * t) * 6.28);
	}
    
	vec2 c = (points[0] + points[1]) / 2.0;
	vec2 c_prev;
	float dist = 10000.0;
    
	for(int i = 0; i < POINT_COUNT-1; i++){
		c_prev = c;
		c = (points[i] + points[i+1]) / 2.0;
		dist = min(dist, sdBezier(pos, scale * c_prev, scale * points[i], scale * c));
	}
	return max(0.0, dist);
}

void main(){
	vec2 uv = gl_FragCoord.xy/resolution.xy;
	float widthHeightRatio = resolution.x/resolution.y;
	vec2 centre = vec2(0.5, 0.5);
	vec2 pos = centre - uv;
	pos.y /= widthHeightRatio;
	pos.y += 0.02;
	float scale = 0.000015 * height;
	
	float t = time;
    
  float dist = getSegment(t, pos, 0.0, scale);
  float glow = getGlow(dist, radius, intensity);
  
  vec3 col = vec3(0.0);

	col += 10.0*vec3(smoothstep(0.003, 0.001, dist));
  col += glow * vec3(1.0,0.05,0.3);
  
  dist = getSegment(t, pos, 3.4, scale);
  glow = getGlow(dist, radius, intensity);
  
  col += 10.0*vec3(smoothstep(0.003, 0.001, dist));
  col += glow * vec3(0.1,0.4,1.0);
        
	col = 1.0 - exp(-col);
	col = pow(col, vec3(0.4545));
 	gl_FragColor = vec4(col,1.0);
}
`;

// ************** Các hàm tiện ích cho WebGL **************

window.addEventListener('resize', onWindowResize, false);
function onWindowResize(){
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
	gl.viewport(0, 0, canvas.width, canvas.height);
  gl.uniform1f(widthHandle, window.innerWidth);
  gl.uniform1f(heightHandle, window.innerHeight);
}

// Hàm biên dịch shader
function compileShader(shaderSource, shaderType){
  var shader = gl.createShader(shaderType);
  gl.shaderSource(shader, shaderSource);
  gl.compileShader(shader);
  if(!gl.getShaderParameter(shader, gl.COMPILE_STATUS)){
  	throw "Shader compile failed with: " + gl.getShaderInfoLog(shader);
  }
  return shader;
}

// Hàm lấy vị trí attribute
function getAttribLocation(program, name) {
  var attributeLocation = gl.getAttribLocation(program, name);
  if (attributeLocation === -1) {
  	throw 'Không tìm thấy attribute ' + name + '.';
  }
  return attributeLocation;
}

// Hàm lấy vị trí uniform
function getUniformLocation(program, name) {
  var uniformLocation = gl.getUniformLocation(program, name);
  if (uniformLocation === -1) {
  	throw 'Không tìm thấy uniform ' + name + '.';
  }
  return uniformLocation;
}

// ************** Tạo shaders và chương trình **************
var vertexShader = compileShader(vertexSource, gl.VERTEX_SHADER);
var fragmentShader = compileShader(fragmentSource, gl.FRAGMENT_SHADER);
var program = gl.createProgram();
gl.attachShader(program, vertexShader);
gl.attachShader(program, fragmentShader);
gl.linkProgram(program);
gl.useProgram(program);

// Thiết lập dữ liệu vertex cho hình chữ nhật phủ toàn bộ canvas
var vertexData = new Float32Array([
  -1.0,  1.0, 	// top left
  -1.0, -1.0, 	// bottom left
   1.0,  1.0, 	// top right
   1.0, -1.0, 	// bottom right
]);

var vertexDataBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, vertexDataBuffer);
gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.STATIC_DRAW);

var positionHandle = getAttribLocation(program, 'position');
gl.enableVertexAttribArray(positionHandle);
gl.vertexAttribPointer(positionHandle,
  2,         // vec2 có 2 giá trị
  gl.FLOAT,  // mỗi giá trị là float
  false,
  2 * 4,     // 2 giá trị, mỗi giá trị 4 byte
  0
);

var timeHandle = getUniformLocation(program, 'time');
var widthHandle = getUniformLocation(program, 'width');
var heightHandle = getUniformLocation(program, 'height');

gl.uniform1f(widthHandle, window.innerWidth);
gl.uniform1f(heightHandle, window.innerHeight);

var lastFrame = Date.now();
var thisFrame;

// Hàm vẽ khung hình cho WebGL
function draw(){	
	thisFrame = Date.now();
  time += (thisFrame - lastFrame) / 1000;	
	lastFrame = thisFrame;

	gl.uniform1f(timeHandle, time);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  requestAnimationFrame(draw);
}

draw();
