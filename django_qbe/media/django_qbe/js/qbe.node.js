if (!window.qbe) {
    var qbe = {};
}

/**
 * @class qbe.Node
 * @constructor
 */
qbe.Node = function(config, layer) {
    var ddHandleCn = WireIt.cn('div', {className: 'WireIt-Container-ddhandle'}, null, config.title);
    config.ddHandleCn = ddHandleCn;
    config.width = 150;
    config.height = (config.inputs.length + config.outputs.length) * 30 + 40;
    if (!config.position) {
        config.position = [Math.floor ( Math.random ( ) * 600 + 1 ), Math.floor ( Math.random ( ) * 250 + 1 )];
    }
    if (!config.resizable) {
        config.resizable = false;
    }
    config.id = new Date().getTime();
    qbe.Node.superclass.constructor.call(this, config, layer);
    this.config = config;
    this.renderBody();
    this.createTerminals();
    if(this.layer) {
        if (this.layer.focusedContainer && this.layer.focusedContainer != this) {
            this.layer.focusedContainer.removeFocus();
        }
        this.setFocus();
        this.layer.focusedContainer = this;
    }
};


YAHOO.extend(qbe.Node, WireIt.Container, {

    renderBody: function() {
        var bodyHTML = '';
        for (var i=0; i<this.config.inputs.length; i++) {
            bodyHTML = bodyHTML + '<div style="line-height:30px">' + this.config.inputs[i] + '</div>';
        }
        for (i=0; i<this.config.outputs.length; i++) {
            bodyHTML = bodyHTML + '<div style="line-height:30px; text-align: right;">' + this.config.outputs[i] + '</div>';
        }
        this.setBody(bodyHTML);
    },

    /**
     * Create (and re-create) the terminals with this.nParams input terminals
     */
    createTerminals: function() {
        // Remove all the existing terminals
        this.removeAllTerminals();

        for (var i = 0 ; i < this.config.inputs.length ; i++) {
            var term = this.addTerminal({xtype: "WireIt.util.TerminalInput"});
            term.Node = this;
            WireIt.sn(term.el, null, {position: "absolute",
                                      top: ((i * 30)+33) + 'px',
                                      left: (-14) + 'px'});
        }

        for (var i = 0 ; i < this.config.outputs.length ; i++) {
            var term = this.addTerminal({xtype: "WireIt.util.TerminalOutput"});
            term.Node = this;
            WireIt.sn(term.el, null, {position: "absolute",
                                      top: (((i + this.config.inputs.length) * 30)+33) + 'px',
                                      left: (this.config.width - 16) + 'px'});
        }

        // Fix wires to container (no moving)
        // this.positionTerminals();

        // Declare the new terminals to the drag'n drop handler
        // (so the wires are moved around with the container)
        this.dd.setTerminals(this.terminals);
    },

    /**
     * Extend the getConfig to add the our properties
     */
    getConfig: function() {
        var obj = qbe.Node.superclass.getConfig.call(this);
        obj.application = this.application;
        obj.title = this.config.title;
        obj.resizable = this.config.resizable;
        obj.inputs = this.config.inputs;
        obj.outputs = this.config.outputs;
        obj.close = this.close;
        obj.edit = this.config.edit;
        if (this.config.edit) {
            obj.edit = this.config.edit;
            var idVal = this.config.title + '_' + this.config.id + '_' + this.config.outputs[0];
            var value = document.getElementById(idVal).value;
            obj.value = encodeURIComponent((value+'').replace(/(["])/g, "\\$1").replace(/\0/g, "\\0"));
        }
        return obj;
    }
});

/**
 * Toggle visibility of models
 */
qbe.Node.toggleModule = function (appName, modelName) {
    var model = qbe.Models[appName][modelName];
    var checked = document.getElementById('qbeModel_'+ modelName).checked;
    if (!model.index && checked) {
        qbe.Node.addModule(appName, modelName);
    } else {
        qbe.Node.Layer.removeContainer(qbe.Node.Layer.containers[model.index-1]);
        delete model.index;
    }
}

/**
 * Adds a qbe.Node to the layer
 */
qbe.Node.addModule = function (appName, modelName) {
    var model = qbe.Models[appName][modelName];
    var inouts = qbe.Node.getInOuts(model);
    qbe.Node.Layer.addContainer({xtype: "qbe.Node",
                                 application: appName,
                                 title: modelName,
                                 inputs: inouts[0],
                                 outputs: inouts[1],
                                 close: false});
    model.index = qbe.Node.Layer.containers.length;
    if (model.relations.length) {
        qbe.updateRelations(model);
    }
};

/*
 * Update relations among models
 */
qbe.updateRelations = function (model) {
    var wires = [];
    var relations = model.relations;
    // wires = [{src: {moduleId: 1, terminalId: 2}, tgt: {moduleId: 1, terminalId: 3}}]
    for(i=0; i<=relations.length; i++) {
        var relation = relations[i];
        if (relation) {
            var source_field = model.fields[relation.source].index;
            var source_model = model.index;
            var src = {'moduleId': source_model, 'terminalId': source_field}
            var target = relation.target;
            var target_model = qbe.Models[target.name][target.model].index;
            var target_field = target.field;
            var tgt = {'moduleId': target_model, 'terminalId': source_field}
            var wire = {src: src, tgt: tgt}
            if (target_model) {
                wires.push(wire);
            }
        }
    }
    // qbe.Node.Layer.setWiring(wires);
}

/**
 * Return in & outs according to relations among models
 */
qbe.Node.getInOuts = function(model) {
    var inputs = [];
    var outputs = [];
    var fields = model.fields || {};
    for(key in fields) {
        if (fields[key].target) {
            outputs.push(fields[key].label);
            fields[key].index = outputs.length;
        } else {
            inputs.push(fields[key].label);
            fields[key].index = inputs.length;
        }
    }
    return [inputs, outputs];
}

/*
 * Create main layer for QBE diagram
 */
qbe.createLayer = function() {
    var parentEl = document.getElementById('qbeDiagram');
    qbe.Containers.parentEl = parentEl;

    if (qbe.Containers.containers != undefined) {
        // rescale
        var minX = 0;
        var minY = 0;
        var maxX = 800;
        var maxY = 400;
        for (var i=0; i < qbe.Containers.containers.length; i++) {
            if (qbe.Containers.containers[i].position[0] < minX) {
                minX = qbe.Containers.containers[i].position[0];
            }
            if (qbe.Containers.containers[i].position[0] > maxX) {
                maxX = qbe.Containers.containers[i].position[0];
            }
        }
        if (minX < 0) {
            for (i=0; i < qbe.Containers.containers.length; i++) {
                qbe.Containers.containers[i].position[0] -= minX - 10;
            }
        }
    }
    qbe.Node.Layer = new WireIt.Layer(qbe.Containers);
    qbe.Node.Layer.eventContainerDragged.subscribe(function(e,params) {
        var container = params[0];
        var top = parseFloat(container.el.style.top);
        if (top <= 0) {
            container.el.style.top = "0px";
        }
        var left = parseFloat(container.el.style.left)
        if (left <= 0) {
            container.el.style.left = "0px";
        }
    });
}

/**
 * Init the qbe.Node layer with a default program
 */
YAHOO.util.Event.addListener(window, "load", function() {
    qbe.createLayer();
});
