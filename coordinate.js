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
var snap = 16;
var zoomSlider = document.getElementById('zoom');
var snapSlider = document.getElementById('snap');
var output = document.getElementById('_exported');
var lines = [];
var sprites = [];
var mzoom = document.getElementById('mzoom');
var msnap = document.getElementById('msnap');
var building = null;
var coords = document.getElementById('coords');
var camPos = null;
var sprPos = null;
var sprForm = document.getElementById('spriteForm');
var canvas = document.getElementById('planGrid');
var ctx = canvas.getContext('2d');

var _shift = false;
var _ctrl = false;

function sshift(s)
{
    _shift = s;
}

function sctrl(s)
{
    _ctrl = s;
}

function renderGrids()
{
    for ( x = 0; x < canvas.width; x++ )
        if ( x % (snap * zoom / 64) < 1 )
        {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
            ctx.lineWidth = 1;
            ctx.strokeStyle = "#88000044";
            ctx.stroke();
        }
        
    for ( y = 0; y < canvas.height; y++ )
        if ( y % (snap * zoom / 64) < 1 )
        {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.lineWidth = 1;
            ctx.strokeStyle = "#88000044";
            ctx.stroke();
        }
        
    for ( x = 0; x < canvas.width; x++ )
        if ( x % (8 * zoom / 64) < 1 )
        {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
            ctx.lineWidth = 1;
            ctx.strokeStyle = "#00880044";
            ctx.stroke();
        }
        
    for ( y = 0; y < canvas.height; y++ )
        if ( y % (8 * zoom / 64) < 1 )
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
        ctx.moveTo(lines[i][0][0] * zoom / 64, lines[i][0][1] * zoom / 64);
        ctx.lineTo(lines[i][1][0] * zoom / 64, lines[i][1][1] * zoom / 64);
        ctx.lineWidth = 2;
        ctx.strokeStyle = "#000000FF";
        ctx.stroke();
    }
    
    if ( camPos != null )
    {
        ctx.beginPath();
        ctx.arc(camPos[0] * zoom / 64, camPos[1] * zoom / 64, 0.0625 * zoom, 0, 2 * Math.PI, false);
        ctx.fillStyle = "#1111FF";
        ctx.fill();
    }
    
    if ( sprPos != null )
    {
        ctx.beginPath();
        ctx.arc(sprPos[0] * zoom / 64, sprPos[1] * zoom / 64, 0.0625 * zoom, 0, 2 * Math.PI, false);
        ctx.strokeStyle = "#FFFF11";
        ctx.stroke();
    }
    
    for ( let i = 0; i < sprites.length; i++ )
    {
        ctx.beginPath();
        console.log(sprites[i].pos[0] * zoom / 64, sprites[i].pos[1] * zoom / 64);
        ctx.arc(sprites[i].pos[0] * zoom / 64, sprites[i].pos[1] * zoom / 64, sprites[i].size / 16 * zoom, 0, 2 * Math.PI, false);
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
    var cx = Math.round(mouseCoords(e, canvas)[0] / zoom * 64 / snap) * snap;
    var cy = Math.round(mouseCoords(e, canvas)[1] / zoom * 64 / snap) * snap;

    if ( _shift )
    {
        coords.innerHTML = cx + "," + cy;
        camPos = [cx, cy];
    }
    
    else if ( _ctrl )
    {
        coords.innerHTML = cx + "," + cy;
        sprPos = [cx, cy];
    }
    
    else
    {
        if ( building != null )
        {
            lines.push([building, [cx, cy], 5]);
            
            building = null;
        }
        
        else
            building = [cx, cy];
    }
    
    render();
}

document.onkeypress = function canvasPress(e)
{
    if ( e.charCode == 122 )
    {
        lines.pop(lines.length - 1);
        building = null;
        render();
    }
    
    else if ( e.charCode == 32 && sprPos != null )
    {
        sprForm.style.display = "block";
    }
}

document.onkeyup = function canvasKup(e)
{
    if ( e.keyCode == 16 )
        sshift(false);
    
    if ( e.keyCode == 17 )
        sctrl(false);
}

document.onkeydown = function canvasKup(e)
{
    if ( e.keyCode == 16 )
        sshift(true);
    
    if ( e.keyCode == 17 )
        sctrl(true);
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
            fov: 100
        }
    });
}

function submitSprite(size, type)
{
    if ( type in ['', null, undefined] )
        return;
    
    sprites.push({ type: type, size: size, pos: sprPos });
    sprForm.style.display = "none";
    sprPos = null;
    render();
}

render();
