/**
 * @class qbeNode
 * @constructor
 */

var qbeNode = function(config, layer) {

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

   qbeNode.superclass.constructor.call(this, config, layer);
   this.config = config;
   this.renderBody();
   this.createTerminals();
   if(this.layer) {
      if(this.layer.focusedContainer && this.layer.focusedContainer != this) {
         this.layer.focusedContainer.removeFocus();
      }
      this.setFocus();
      this.layer.focusedContainer = this;
   }
};

YAHOO.extend(qbeNode, WireIt.Container, {

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
             term.qbeNode = this;
             WireIt.sn(term.el, null, {position: "absolute",
                                       top: ((i * 30)+33) + 'px',
                                       left: (-14) + 'px'});
         }

        for (var i = 0 ; i < this.config.outputs.length ; i++) {
            var term = this.addTerminal({xtype: "WireIt.util.TerminalOutput"});
             term.qbeNode = this;
             WireIt.sn(term.el, null, {position: "absolute",
                                       top: (((i + this.config.inputs.length) * 30)+33) + 'px',
                                       left: (this.config.width - 16) + 'px'});
         }

          // Fix wires to container (no moving)
          //this.positionTerminals();

          // Declare the new terminals to the drag'n drop handler
          // (so the wires are moved around with the container)
          this.dd.setTerminals(this.terminals);
    },
   
   /**
    * Extend the getConfig to add the our properties
    */
   getConfig: function() {
      var obj = qbeNode.superclass.getConfig.call(this);
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

qbeNode.toggleModule = function (appName, modelName) {
    var model = qbeModels[appName][modelName];
    var checked = document.getElementById('qbeModel_'+ modelName).checked
    if (!model.index && checked) {
        qbeNode.addModule(appName, modelName);
    } else {
        qbeNode.qbeNodeLayer.removeContainer(qbeNode.qbeNodeLayer.containers[model.index-1]);
        delete model.index;
    }
}


/**
 * Adds a qbeNode to the layer
 */

qbeNode.addModule = function (appName, modelName) {
    var model = qbeModels[appName][modelName];
    var inouts = qbeNode.getInOuts(model);
    qbeNode.qbeNodeLayer.addContainer({xtype: "qbeNode",
                                       application: appName,
                                       title: modelName,
                                       inputs: inouts[0],
                                       outputs: inouts[1],
                                       close: false});
    model.index = qbeNode.qbeNodeLayer.containers.length;
};


/**
 * Returns in & outs according to relations among models
 */

qbeNode.getInOuts = function(model) {
    var inputs = [];
    var outputs = [];
    var fields = model.fields || {};
    for(key in fields) {
        if (fields[key].target) {
            outputs.push(fields[key].label);
        } else {
            inputs.push(fields[key].label);
        }
    }
    return [inputs, outputs];
}

function createQBELayer() {
    var parentEl = document.getElementById('qbeDiagram');
    qbeContainers.parentEl = parentEl;

    if (qbeContainers.containers != undefined) {
        // rescale
        var minX = 0;
        var minY = 0;
        var maxX = 800;
        var maxY = 400;
        for (var i=0; i < qbeContainers.containers.length; i++) {
            if (qbeContainers.containers[i].position[0] < minX) {
                minX = qbeContainers.containers[i].position[0];
            }
            if (qbeContainers.containers[i].position[0] > maxX) {
                maxX = qbeContainers.containers[i].position[0];
            }
        }
        if (minX < 0) {
            for (i=0; i < qbeContainers.containers.length; i++) {
                qbeContainers.containers[i].position[0] -= minX - 10;
            }
        }
    }
    qbeNode.qbeNodeLayer = new WireIt.Layer(qbeContainers);
}


/**
 * Init the qbeNode layer with a default program
 */
 
YAHOO.util.Event.addListener(window, "load", function() {
    createQBELayer();
});
