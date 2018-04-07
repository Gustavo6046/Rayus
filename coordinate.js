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
var coords = document.getElementById('coords');
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

var _shift = false;
var _ctrl = false;
var _alt = false;

var lastMove = null;

canvas.onmousedown = function() {
    canvas.onmousemove = function(e) {
        var cx = mouseCoords(e, canvas)[0] / zoom * 64;
        var cy = mouseCoords(e, canvas)[1] / zoom * 64;
        
        /*
        if ( !moved )
        {
            if ( building == null )
            {
                building = lastBuild[lastBuild.length - 1];
                lines.splice(lines.length - 1, 1);
            }
            
            else
            {
                building = null;
                lastBuild.splice(lastBuild.length - 1, 1);
            }
        }
        */
        
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
   
    console.log(moved);
    
    if ( !moved )
    {
        var cx = Math.round((mouseCoords(e, canvas)[0] + pan[0] * zoom / 64) / zoom * 64 / snap) * snap;
        var cy = Math.round((mouseCoords(e, canvas)[1] + pan[1] * zoom / 64) / zoom * 64 / snap) * snap;

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
                        coords.innerHTML = cx + "," + cy;
                    }
                }
                
                for ( let i = bad.length - 1; i >= 0; i-- )
                    sprites.splice(i, 1);
            }
                
            else
            {
                coords.innerHTML = cx + "," + cy;
                sprPos = [cx, cy];
            }
        }
        
        else if ( _shift )
        {
            coords.innerHTML = cx + "," + cy;
            camPos = [cx, cy];
        }
        
        else
        {
            if ( building != null )
            {
                let line = [building, [cx, cy], (+document.getElementById('wsize').value || 5)];
                
                if ( _alt )
                {
                    let ljson = JSON.stringify(line);
                    
                    if ( lines.map(JSON.stringify).indexOf(ljson) > -1 )
                        lines.splice(lines.map(JSON.stringify).indexOf(ljson), 1);
                    
                    else
                    {
                        line = [line[1], line[0], line[2]];
                        ljson = JSON.stringify(line);
                    
                        if ( lines.map(JSON.stringify).indexOf(line) > -1 )
                            lines.splice(lines.map(JSON.stringify).indexOf(ljson), 1);
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
        
        render();
    }
        
    else
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

function render()
{
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    renderGrids();
    
    for ( let i = 0; i < lines.length; i++ )
    {
        ctx.beginPath();
        ctx.moveTo((lines[i][0][0] - pan[0]) * zoom / 64, (lines[i][0][1] - pan[1]) * zoom / 64);
        ctx.lineTo((lines[i][1][0] - pan[0]) * zoom / 64, (lines[i][1][1] - pan[1]) * zoom / 64);
        
        if ( !window.d ) {window.d = true; console.log((lines[i][0][0] - pan[0]), (lines[i][1][0] - pan[0]));}
        
        ctx.lineWidth = 2;
        ctx.strokeStyle = "#" + colorHex(lines[i][2] / 25) + "0000FF";
        ctx.stroke();
    }
    
    if ( camPos != null )
    {
        ctx.beginPath();
        ctx.arc((camPos[0] - pan[0]) * zoom / 64, (camPos[1] - pan[1]) * zoom / 64, 0.0625 * zoom, 0, 2 * Math.PI, false);
        ctx.fillStyle = "#1111FF";
        ctx.fill();
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
        ctx.arc((sprites[i].pos[0] - pan[0]) * zoom / 64, (sprites[i].pos[1] - pan[1]) * zoom / 64, sprites[i].size / 16 * zoom, 0, 2 * Math.PI, false);
        ctx.fillStyle = "#FF8000";
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
    
    if ( !(':' in host) || "" in host.split(':') )
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
                    output.value = msg.slice(msg.indexOf(':') + 1);
                    mlstatus("SUCCESS");
                    _import();
                }
            }
        }
        
        return true;
    });
}

function upload()
{
    let data = _export();
    
    mapList(function(conn) {
        conn.send("SAVE:" + data);
    });
}

function _import()
{
    let data = JSON.parse(output.value);
    
    lines = data.walls;
    sprites = data.sprites;
    camPos = data.camera.pos;
    sprPos = null;
    building = null;
    _shift = false;
    _ctrl = false;
    
    render();
}

function _export()
{
    if ( camPos == null )
    {
        output.value = "Set a camera position with Shift + Click!"
        return;
    }
    
    output.value = JSON.stringify({
        walls: lines,
        sprites: sprites,
        camera: {
            pos: camPos,
            angle: 0,
            fov: 80
        }
    });
    
    return output.value
}

function submitSprite(size, type)
{
    if ( type in ['', null, undefined] )
        return;
    
    sprites.push({ type: type, size: +size, pos: sprPos });
    sprForm.style.display = "none";
    sprPos = null;
    render();
}

render();
