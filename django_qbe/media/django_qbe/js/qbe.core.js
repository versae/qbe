if (!window.qbe) {
    var qbe = {};
}
qbe.CurrentModels = [];
qbe.Core = function() {};

/**
 * Toggle visibility of models
 */
qbe.Core.toggleModule = function (appName, modelName) {
    var model = qbe.Models[appName][modelName];
    var checked = document.getElementById('qbeModel_'+ modelName).checked;
    if (checked) {
        qbe.Core.addModule(appName, modelName);
    } else {
        qbe.Core.removeModule(appName, modelName);
    }
}

/**
 * Adds a qbe.Core to the layer
 */
qbe.Core.addModule = function (appName, modelName) {
    var model = qbe.Models[appName][modelName];
    var inouts = qbe.Core.getInOuts(model);
    var appModel = appName +"."+ modelName;
    if (qbe.CurrentModels.indexOf(appModel) < 0) {
        qbe.CurrentModels.push(appModel);
        if (model.relations.length > 0) {
            qbe.updateRelations(model);
        }
    }
};

/*
 * Removes a qbe Node from the layer
 */
qbe.Core.removeModule = function(appName, modelName) {
    var appModel = appName +"."+ modelName;
    var pos = qbe.CurrentModels.indexOf(appModel);
    if (pos >= 0) {
        qbe.CurrentModels.splice(pos, 1);
        var model = qbe.Models[appName][modelName];
        delete model.index;
    }
};

/*
 * Update relations among models
 */
qbe.updateRelations = function (model) {
    var relations = model.relations;
    // wires = [{src: {moduleId: 1, terminalId: 2}, tgt: {moduleId: 1, terminalId: 3}}]
    for(i=0; i<=relations.length; i++) {
        var relation = relations[i];
        if (relation) {
            var source_field = model.fields[relation.source].index;
            var source_model = model.index;
            var target = relation.target;
            var target_model = qbe.Models[target.name][target.model].index;
            var target_field = target.field;
            if (source_model && target_model) {
                // TODO: Fix relations creation
                console.log(source_model)
                // console.log(qbe.Node.Layer.containers[source_model]);
                console.log(target_model)
                // console.log(qbe.Node.Layer.containers[target_model]);
            }
        }
    }
}

/**
 * Return in & outs according to relations among models
 */
qbe.Core.getInOuts = function(model) {
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

