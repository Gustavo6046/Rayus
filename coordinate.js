//==============================
// credits: Ryan Artecona
// https://stackoverflow.com/a/5932203/5129091
function mouseCoords(event, el)
{
    var totalOffsetX = 0;
    var totalOffsetY = 0;
    var canvasX = 0;
    var canvasY = 0;

    do
    {
        totalOffsetX += el.offsetLeft - el.scrollLeft;
        totalOffsetY += el.offsetTop - el.scrollTop;
    }
    
    while( el = el.offsetParent );

    canvasX = event.pageX - totalOffsetX;
    canvasY = event.pageY - totalOffsetY;

    return [canvasX, canvasY];
}
//==============================


var zoom = 128;
var snap = 8;
var zoomSlider = document.getElementById('zoom');
var snapSlider = document.getElementById('snap');
var output = document.getElementById('_exported');
var lines = [];
var sprites = [];
var mzoom = document.getElementById('mzoom');
var msnap = document.getElementById('msnap');
var building = null;
var lastBuild = [];
var camPos = null;
var sprPos = null;
var sprForm = document.getElementById('spriteForm');
var canvas = document.getElementById('planGrid');
var ctx = canvas.getContext('2d');
var mlhost = function() { return document.getElementById('mlhost').value; };
var mlstatus = function(status) { document.getElementById('mlstatus').innerHTML = status; };
var m_id = function() { return document.getElementById('m_id').value; };
var helpSheet = document.getElementById('helpSheet');
var pan = [0, 0];
var moved = false;
var selCol = document.getElementById('sel_color');
var selTex = document.getElementById('sel_tex');
var textured = false;
var camAim = null;
var liteForm = document.getElementById('liteForm');
var beginPos = null;
var lights = [];
var labelForm = document.getElementById('labelForm');
var mmusic = null;
var mapTriggerForm = document.getElementById('mapTriggerForm');
var map_mplayer = new Audio();

var _shift = false;
var _ctrl = false;
var _alt = false;

var lastMove = null;

Number.prototype.clamp = function(min, max)
{
    return Math.min(Math.max(this, min), max);
}

function playMusic()
{
    if ( map_mplayer.paused && mmusic != null )
    {
        map_mplayer.src = mmusic;
        map_mplayer.currentTime = 0;
        map_mplayer.play();
    }
    
    else
    {
        map_mplayer.pause();
    }
}

function lineComp(l)
{
    return l.slice(0, 2);
}

function wallDisplay()
{
    if ( textured )
        return document.getElementById('tex').value;
    
    else
        return [+document.getElementById('cred').value / 100, +document.getElementById('cgreen').value / 100, +document.getElementById('cblue').value / 100];
}

canvas.onmousedown = function() {
    canvas.onmousemove = function(e) {
        var cx = mouseCoords(e, canvas)[0] / zoom * 64;
        var cy = mouseCoords(e, canvas)[1] / zoom * 64;
        
        if ( _shift )
        {
            if ( !moved )
                beginPos = [cx + pan[0], cy + pan[1]];
                
            else
            {
                camPos = beginPos.map(function(x) { return Math.round(x / snap) * snap; });
                camAim = Math.atan2(cy + pan[1] - camPos[1], cx + pan[0] - camPos[0]);
            }
            
            moved = true;
            
            render();
            
            return;
        }
        
        if ( !moved )
            lastMove = [cx, cy];
        
        moved = true;
        
        if ( lastMove != null )
        {
            pan[0] -= cx - lastMove[0];
            pan[1] -= cy - lastMove[1];
        }
        
        lastMove = [cx, cy];
        render();
    }
}

canvas.onmouseup = function(e) {
    canvas.onmousemove = null;
    
    var cx = Math.round((mouseCoords(e, canvas)[0] + pan[0] * zoom / 64) / zoom * 64 / snap) * snap;
    var cy = Math.round((mouseCoords(e, canvas)[1] + pan[1] * zoom / 64) / zoom * 64 / snap) * snap;

    if ( !moved )
    {
        if ( _ctrl )
        {
            if ( _shift )
            {
                let bad = [];
                
                for ( let i = 0; i < sprites.length; i++ )
                {                
                    if ( JSON.stringify(sprites[i].pos) == JSON.stringify([cx, cy]) )
                    {
                        bad.push(i);
                    }
                }
                
                for ( let i = bad.length - 1; i >= 0; i-- )
                    sprites.splice(bad[i], 1);
                
                bad = [];
                
                for ( let i = 0; i < lights.length; i++ )
                {                
                    if ( JSON.stringify(lights[i].pos) == JSON.stringify([cx, cy]) )
                    {
                        bad.push(i);
                    }
                }
                
                for ( let i = bad.length - 1; i >= 0; i-- )
                    lights.splice(bad[i], 1);
            }
                
            else
            {
                sprPos = [cx, cy];
            }
        }
        
        else
        {
            if ( building != null )
            {
                let line = [building, [cx, cy], (+document.getElementById('wsize').value || 5), wallDisplay()];
                
                if ( _alt )
                {
                    let rline = lineComp(line)
                    let ljson = JSON.stringify(rline);
                    
                    if ( lines.map(function(r) { return JSON.stringify(lineComp(r)) }).indexOf(ljson) > -1 )
                        lines.splice(lines.map(function(r) { return JSON.stringify(lineComp(r)) }).indexOf(ljson), 1);
                    
                    else
                    {
                        rline = [rline[1], rline[0]];
                        ljson = JSON.stringify(rline);
                    
                        if ( lines.map(function(r) { return JSON.stringify(lineComp(r)) }).indexOf(ljson) > -1 )
                            lines.splice(lines.map(function(r) { return JSON.stringify(lineComp(r)) }).indexOf(ljson), 1);
                    }
                }
                    
                else
                    lines.push(line);
                
                building = null;
            }
            
            else
            {
                building = [cx, cy];
                lastBuild.push(building);
            }
        }
    }
    
    render();    
    moved = false;
}

function help(disp)
{
    helpSheet.style.display = disp;
    setTimeout(function() { window.scrollTo(0, 0) }, 250);
}

function sshift(s)
{
    _shift = s;
}

function sctrl(s)
{
    _ctrl = s;
}

function salt(s)
{
    _alt = s;
}

function colorHex(number)
{
    number = Math.floor(number * 255);
    
    if (number < 0)
        number = 0xFFFFFFFF + number + 1;

    var res = number.toString(16).toUpperCase();
    
    if ( res.length == 1 ) 
        return "0" + res;
    
    return res;
}

function renderGrids()
{
    for ( x = 0; x < canvas.width; x++ )
        if ( Math.abs((x + pan[0] * zoom / 64) % (snap * zoom / 64)) < 1 )
        {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
            ctx.lineWidth = 1;
            ctx.strokeStyle = "#88000044";
            ctx.stroke();
        }
        
    for ( y = 0; y < canvas.height; y++ )
        if ( Math.abs((y + pan[1] * zoom / 64) % (snap * zoom / 64)) < 1 )
        {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.lineWidth = 1;
            ctx.strokeStyle = "#88000044";
            ctx.stroke();
        }
        
    for ( x = 0; x < canvas.width; x++ )
        if ( Math.abs((x + pan[0] * zoom / 64) % (8 * zoom / 64)) < 1 )
        {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
            ctx.lineWidth = 1;
            ctx.strokeStyle = "#00880044";
            ctx.stroke();
        }
        
    for ( y = 0; y < canvas.height; y++ )
        if ( Math.abs((y + pan[1] * zoom / 64) % (8 * zoom / 64)) < 1 )
        {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.lineWidth = 1;
            ctx.strokeStyle = "#00880044";
            ctx.stroke();
        }
}

function renderTrigger(t)
{
    var pattern = document.createElement('canvas');
    pattern.width = 40;
    pattern.height = 40;
    var pctx = pattern.getContext('2d');

    pctx.fillStyle = "rgb(255, 0, 255)";
    pctx.fillRect(0,0, 0.0 ,0.01 * zoom, 0.01 * zoom);
    pctx.fillRect(0.01 * zoom, 0.01 * zoom, 0.01 * zoom, 0.01 * zoom);
    
    var pattern = ctx.createPattern(pattern, "repeat");
    
    ctx.beginPath();
    ctx.arc((t.pos[0] - pan[0]) * zoom / 64, (t.pos[1] - pan[1]) * zoom / 64, t.radius * zoom / 64, 0, 2 * Math.PI, false);
    ctx.fillStyle = pattern;
    ctx.fill();
    
    ctx.fillStyle = "white";
    ctx.strokeStyle = "black";
    ctx.lineWidth = 1 / 64 * zoom;
    
    ctx.font = (0.005 * zoom) + "px Arial"; // ~12px on 128 zoom
    ctx.textAlign = "center";
    
    ctx.fillText(t.nextMap, (t.pos[0] - pan[0]) * zoom / 64, (t.pos[1] - pan[1]) * zoom / 64);
    ctx.strokeText(t.nextMap, (t.pos[0] - pan[0]) * zoom / 64, (t.pos[1] - pan[1]) * zoom / 64);
}

function render()
{
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    renderGrids();
    
    for ( let i = 0; i < lines.length; i++ )
    {
        ctx.beginPath();
        ctx.moveTo((lines[i][0][0] - pan[0]) * zoom / 64, (lines[i][0][1] - pan[1]) * zoom / 64);
        ctx.lineTo((lines[i][1][0] - pan[0]) * zoom / 64, (lines[i][1][1] - pan[1]) * zoom / 64);
        
        ctx.lineWidth = 3;
        
        if ( typeof lines[i][3] == 'string' )
        {
            ctx.strokeStyle = "#FFFF00FF";
            ctx.setLineDash([3, 2]);
        }
            
        else
            ctx.strokeStyle = "#" + colorHex(lines[i][3][0]) + colorHex(lines[i][3][1]) + colorHex(lines[i][3][2]) + "FF";
        
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo((lines[i][0][0] - pan[0]) * zoom / 64, (lines[i][0][1] - pan[1]) * zoom / 64);
        ctx.lineTo((lines[i][1][0] - pan[0]) * zoom / 64, (lines[i][1][1] - pan[1]) * zoom / 64);
        
        ctx.lineWidth = 1;
        ctx.strokeStyle = "#" + colorHex((lines[i][2] / 15).clamp(0, 1)) + colorHex((lines[i][2] / 10 - 1.5).clamp(0, 1)).repeat(2) + "FF";
        ctx.stroke();
        
        if ( typeof lines[i][3] == 'string' )
            ctx.setLineDash([1, 0]);
    }
    
    if ( camPos != null )
    {
        ctx.beginPath();
        ctx.arc((camPos[0] - pan[0]) * zoom / 64, (camPos[1] - pan[1]) * zoom / 64, 0.0625 * zoom, 0, 2 * Math.PI, false)
        ctx.fillStyle = "#1111FF";
        ctx.fill();
        
        ctx.beginPath();
        ctx.moveTo((camPos[0] - pan[0]) * zoom / 64, (camPos[1] - pan[1]) * zoom / 64);
        ctx.lineTo((camPos[0] - pan[0]) * zoom / 64 + Math.cos(camAim) * 0.125 * zoom, (camPos[1] - pan[1]) * zoom / 64 + Math.sin(camAim) * 0.125 * zoom);
        
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = "#FFFF00FF";
        ctx.stroke();
    }
    
    if ( sprPos != null )
    {
        ctx.beginPath();
        
        ctx.arc((sprPos[0] - pan[0]) * zoom / 64, (sprPos[1] - pan[1]) * zoom / 64, 0.0625 * zoom, 0, 2 * Math.PI, false);
        ctx.strokeStyle = "#FFFF11";
        ctx.stroke();
    }
    
    for ( let i = 0; i < sprites.length; i++ )
    {
        ctx.beginPath();
        
        if ( sprites[i].kind == 'sprite' )
            ctx.arc((sprites[i].pos[0] - pan[0]) * zoom / 64, (sprites[i].pos[1] - pan[1]) * zoom / 64, sprites[i].size / 32 * zoom, 0, 2 * Math.PI, false);
        
        else if ( sprites[i].nextMap )
            renderTrigger(sprites[i]);
        
        else
        {
            ctx.fillStyle = "#FFFFFF";
            ctx.strokeStyle = "#000000";
            ctx.lineWidth = 1 / 64 * zoom;
            ctx.font = (zoom / 10) + "px Arial";
            ctx.textAlign = "center";
            
            ctx.fillText(sprites[i].text, (sprites[i].pos[0] - pan[0]) * zoom / 64, (sprites[i].pos[1] - pan[1]) * zoom / 64);
            ctx.strokeText(sprites[i].text, (sprites[i].pos[0] - pan[0]) * zoom / 64, (sprites[i].pos[1] - pan[1]) * zoom / 64);
        }
        
        ctx.fillStyle = "#FF8000";
        ctx.fill();
    }
    
    for ( let i = 0; i < lights.length; i++ )
    {
        ctx.beginPath();
        ctx.arc((lights[i].pos[0] - pan[0]) * zoom / 64, (lights[i].pos[1] - pan[1]) * zoom / 64, lights[i].radius / 32 * zoom, 0, 2 * Math.PI, false)
        
        if ( lights[i].strength > 0 )
            ctx.fillStyle = "#EEEE00" + colorHex(lights[i].strength / 3);
        
        else
            ctx.fillStyle = "#222222" + colorHex(-lights[i].strength / 3);
            
        ctx.fill();
    }
}

function setZoom()
{
    zoom = Math.pow(2, zoomSlider.value);
    mzoom.innerHTML = zoom;
    
    render();
}

function setSnap()
{
    snap = Math.pow(2, snapSlider.value);
    msnap.innerHTML = snap;
    
    render();
}

function canvasClick(e)
{
    // moved to onmouseup
}

document.onkeypress = function canvasPress(e)
{
    if ( e.charCode == 122 )
    {
        lines.splice(lines.length - 1, 1);
        building = null;
        render();
    }
    
    else if ( e.charCode == 32 && sprPos != null )
    {
        if ( _shift && _ctrl )
            mapTriggerForm.style.display = "block";
        
        else if ( _shift )
            liteForm.style.display = "block";
            
        else if ( _ctrl )
            labelForm.style.display = "block";
        
        else
            sprForm.style.display = "block";
        
        setTimeout(function() { window.scrollTo(0, 0) }, 250);
    }
}

document.onkeyup = function canvasKup(e)
{
    if ( e.keyCode == 16 )
        sshift(false);
    
    if ( e.keyCode == 17 )
        sctrl(false);
    
    if ( e.keyCode == 46 )
        salt(false);
}

document.onkeydown = function canvasKdown(e)
{
    if ( e.keyCode == 16 )
        sshift(true);
    
    if ( e.keyCode == 17 )
        sctrl(true);
    
    if ( e.keyCode == 46 )
        salt(true);
}

function mapList(callback)
{
    let host = mlhost();
    
    if ( host == '' )
    {
        output.value = "Set the host and port of the Websocket server of the maplist with which to connect!"
        return;
    }
    
    let conn = new WebSocket('ws://' + host, ['soap', 'xmpp']);
    
    conn.onopen = function() {
        if ( !callback(conn) )
            conn.onmessage = onMapListMessage;
    }
}

function onMapListMessage(msg, isBin)
{
    msg = msg.data;
    
    if ( isBin )
        return; // temporary
    
    else
    {
        let res = msg.split(':')[0];
        
        if ( res == "ERR" )
            mlstatus('<b style="color: red;">' + msg.slice(msg.indexOf(':') + 1) + '</b>');
            
        else
            mlstatus(msg.slice(msg.indexOf(':') + 1));
    }
    
    conn.close()
}

function download()
{
    let id = m_id();
    
    if ( id == '' )
        return;
    
    mapList(function(conn) {
        conn.send("RETRIEVE:" + id);
        
        conn.onmessage = function(msg, isBin) {
            if ( !isBin )
            {
                msg = msg.data;
                
                let res = msg.split(':')[0];
                
                if ( res == "ERR" )
                    mlstatus('<b style="color: red;">' + msg.slice(msg.indexOf(':') + 1) + '</b>');
                    
                else
                {
                    mlstatus("SUCCESS");
                    _import(JSON.parse(msg.slice(msg.indexOf(':') + 1)));
                }
                
                conn.close()
            }
        }
        
        return true;
    });
}

function upload()
{
    let data = _export(true);
    
    mapList(function(conn) {
        conn.send("SAVE:" + data);
        
        conn.onmessage = function(msg, isBin) {
            msg = msg.data;
    
            if ( isBin )
                return; // temporary
            
            else
            {
                let res = msg.split(':')[0];
                
                if ( res == "ERR" )
                    mlstatus('<b style="color: red;">' + msg.slice(msg.indexOf(':') + 1) + '</b>');
                    
                else
                {
                    let mid = msg.slice(msg.indexOf(':') + 1);
    
                    document.getElementById('m_id').value = mid;
                    
                    let url = window.location.href.replace(/coordinate\.html/g, 'index.html') + "?maplist=" + mlhost() + "&mapid=" + mid;
                    console.log(url);
                    
                    mlstatus(url.replace(/&/g, '&amp;'));
                }
            }
            
            conn.close()
        }
        
        return true;
    });
}

function _import(data)
{
    if ( !data )
        data = JSON.parse(output.value);
    
    lines = data.walls;
    sprites = data.sprites;
    camPos = data.camera.pos;
    camAim = data.camera.angle * Math.PI / 180;
    lights = data.lights;
    sprPos = null;
    building = null;
    _shift = false;
    _ctrl = false;
    
    mmusic = data.music;
    
    render();
}

function upMusic(f)
{
    if ( document.getElementById("music").value != "" )
    {
        let reader = new FileReader();
        reader.readAsDataURL(f);
        
        reader.onload = function() {
            mmusic = reader.result;
        }
    }
    
    document.getElementById("music").value = "";
}

function _export(jsonOnly)
{
    if ( camPos == null )
    {
        output.value = "Set a camera position with Shift + Click and drag!"
        return;
    }
    
    let res = JSON.stringify({
        walls: lines,
        sprites: sprites,
        lights: lights,
        music: mmusic,
        loopPoint: document.getElementById('lpoint'),
        camera: {
            pos: camPos,
            angle: camAim * 180 / Math.PI,
            fov: 70
        }
    });
    
    if ( !jsonOnly )
        output.value = res;
    
    return res;
}

function submitSprite(size, type)
{
    if ( type in ['', null, undefined] )
        return;
    
    sprites.push({ type: type, size: +size, pos: sprPos, kind: "sprite" });
    sprForm.style.display = "none";
    sprPos = null;
    render();
}

function submitLabel(size, text)
{
    if ( text in ['', null, undefined] )
        return;
    
    sprites.push({ size: +size, pos: sprPos, kind: "text", text: text });
    labelForm.style.display = "none";
    sprPos = null;
    render();
}

function submitLight(radius, strength)
{
    if ( strength == 0 )
        return;
    
    lights.push({ radius: radius, strength: strength, pos: sprPos });
    liteForm.style.display = "none";
    sprPos = null;
    
    render();
}

function submitMapTrigger(id, radius)
{
    if ( radius == 0 )
        return;
    
    sprites.push({ size: 1, pos: sprPos, kind: "text", text: "", nextMap: id, radius: radius });
    mapTriggerForm.style.display = "none";
    sprPos = null;
    
    render();
}

function setDispType(bTextured)
{
    if ( bTextured )
    {
        selCol.style.display = 'none';
        selTex.style.display = 'inline-block';
    }
    
    else
    {
        selTex.style.display = 'none';
        selCol.style.display = 'inline-block';
    }
    
    textured = bTextured;
}


render();
setDispType(document.getElementById('dispType').value == 'texture');

let url = new URL(location.href);
let _id = url.searchParams.get("mapid");
let _mlhost = url.searchParams.get("maplist");

if ( _mlhost != null )
{
    document.getElementById('mlhost').value = _mlhost;
    
    if ( _id != null )
    {
        console.log("Loading map of ID '" + _id + "' from map list server: " + _mlhost);
        
        document.getElementById('m_id').value = _id;
        download();
    }
}
