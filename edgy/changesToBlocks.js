// Since we're not supposed to be altering the original file too much, monkey
// patching is in order.

(function() {
"use strict";

SymbolMorph.prototype.drawSymbolTurtle = function (canvas, color) {
    // Draw a K_n graph.
    var ctx = canvas.getContext('2d'),
        n = 5,
        node_r = Math.min(canvas.height, canvas.width) / 10,
        r = Math.min(canvas.height, canvas.width) / 2 - node_r,
        i, j;

    ctx.save()

    ctx.lineWidth = 0.5;
    ctx.fillStyle = color.toString();
    ctx.strokeStyle = color.toString();
    for(i = 0; i < n; ++i)
    {
        ctx.beginPath();
        var x = (r * Math.cos(2*Math.PI * i/n - Math.PI/2)) + canvas.width / 2,
            y = (r * Math.sin(2*Math.PI * i/n - Math.PI/2)) + canvas.height / 2;
        ctx.arc(x, y,
                node_r,
                0, 2 * Math.PI,
                false);
        ctx.fill();
        for(j = 0; j < n; ++j)
        {
            ctx.beginPath();
            var x2 = (r * Math.cos(2*Math.PI * j/n - Math.PI/2)) + canvas.width / 2,
                y2 = (r * Math.sin(2*Math.PI * j/n - Math.PI/2)) + canvas.height / 2;
            ctx.moveTo(x, y);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        }
    }
    ctx.restore();

    return canvas;
};

SymbolMorph.prototype.drawSymbolTurtleOutline = SymbolMorph.prototype.drawSymbolTurtle;

PenMorph.prototype.drawNew = function (facing) {
    this.image = newCanvas(this.extent());
    SymbolMorph.prototype.drawSymbolTurtle(this.image, this.color.toString());
};

BlockMorph.prototype.userMenu = (function userMenu(oldUserMenu) {
    return function() {
        var menu = oldUserMenu.call(this);
        menu.addItem("execute remotely", 'executeRemotely');
        return menu;
    };
}(BlockMorph.prototype.userMenu));

BlockMorph.prototype.executeRemotely = function() {
    var myself = this;
    var POLL_WAIT = 1000;

    var ide = this.parentThatIsA(IDE_Morph);
    var xml = ide.serializer.serialize(ide.stage);
    var spriteIdx = ide.stage.children.indexOf(this.parent.owner);
    var blockIdx = this.parent.children.indexOf(this);
    $.post(ide.remoteExecutionURL + '/jobs', JSON.stringify({
        sprite_idx: spriteIdx,
        block_idx: blockIdx,
        project: xml
    }), function(response, status, xhr) {
        var jobId = response.id;
        function pollServer() {
            $.get(ide.remoteExecutionURL + '/jobs/' + jobId, function(response, status, xhr) {
                console.log(response);
                var state = response.state;
                if(state == "finished") {
                    // Success! Fetch the result.
                    $.get(ide.remoteExecutionURL + '/jobs/' + jobId + '/result', function(response, status, xhr) {
                        console.log(response);
                        var value = response;
                        if (myself instanceof ReporterBlockMorph) {
                            if($.isArray(value)) {
                                myself.showBubble(new ListWatcherMorph(new List(value)));
                            } else {
                                myself.showBubble(value);
                            }
                        }
                    });
                } else if(state == "error") {
                    // We died horribly, but Snappy does not have a way of
                    // telling us how we died, yet.
                } else {
                    setTimeout(pollServer, POLL_WAIT);
                }
            });
        }
        pollServer();
    });
};

}());
