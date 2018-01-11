if (!window.qbe) {
    var qbe = {};
}
qbe.CurrentModels = [];
qbe.CurrentRelations = [];
qbe.Core = function() {};


(function($) {
    jsPlumb.ready(function() {


        $('form').submit(function(e){
           $('input[type=submit]').loader();
        });
        /**
         * Handle the loading initial data blocking process
         */
        var _loadingData = false;

        /**
         * Load initial data to edit query
         */
        qbe.Core.loadData = function(data) {
            var initialForms, totalForms, maxForms;
            _loadingData = true;
            initialForms = parseInt(data["form-INITIAL_FORMS"], 10);
            totalForms = parseInt(data["form-TOTAL_FORMS"], 10);
            var positions, positionSplits, splits, appModel, appName, modelName;
            var show, model, field, sorted;
            for (var i = initialForms; i < totalForms; i++) {
                appModel = data["form-" + i + "-model"];
                if (typeof appModel !== "undefined") {
                    if (!(appModel in qbe.CurrentModels)) {
                        splits = appModel.split(".");
                        app = splits[0];
                        model = splits[1];
                        qbe.Core.addModule(app, model);
                    }
                    qbe.Core.updateModels();
                    $("#id_form-" + i + "-model").val(appModel);
                    $("#id_form-" + i + "-model").change();
                    field = data["form-" + i + "-field"];
                    $("#id_form-" + i + "-field").val(field);
                    $("#id_form-" + i + "-field").change();
                    sorted = data["form-" + i + "-sort"];
                    $("#id_form-" + i + "-sort").val(sorted);
                    $("#id_form-" + i + "-show").remove("checked");
                    if (data["form-" + i + "-show"]) {
                        show = data["form-" + i + "-show"];
                        if (show && show == "on") {
                            $("#id_form-" + i + "-show").attr("checked", "checked");
                        }
                    }
                    var c = 0;
                    var criteria = data["form-" + i + "-criteria_" + c];
                    while (criteria) {
                        $("#id_form-" + i + "-criteria_" + c).val(criteria).change();
                        ++c;
                        criteria = data["form-" + i + "-criteria_" + c];
                    }
                }
            }
            $("#id_form_limit").val(data["limit"]);
            positions = data["positions"].split("|");
            for (var j = 0; j < positions.length; j++) {
                if (!positions[j])
                    continue;
                splits = positions[j].split("@");
                appModel = splits[0].split(".");
                appName = appModel[0];
                modelName = appModel[1];
                positionSplits = splits[1].split(";");
                if (!(appModel in qbe.CurrentModels)) {
                    $("#qbeModelItem_" + modelName).toggleClass("selected");
                    qbe.Core.addModule(appName, modelName);
                }

                var box = $("#qbeBox_" + modelName);
                var maxWith = $('#qbeDiagramContainer').width();
                var maxHeight = $('#qbeDiagramContainer').height();
                if (parseInt(positionSplits[0].replace('px')) < maxWith - box.width() &&
                    parseInt(positionSplits[1].replace('px')) < maxHeight) {
                    box.css({
                        left: positionSplits[0],
                        top: positionSplits[1]
                    });
                }
            }
            $("#id_positions").val(data["positions"]);
            _loadingData = false;

            qbe.Core.updateModels();
        };

        /**
         * Toggle visibility of models
         */
        qbe.Core.toggleModel = function() {
            var id, appName, modelName, idSplits, splits, $this;
            $this = $(this);
            idSplits = $this.attr("id").split("qbeModelAnchor_");
            splits = idSplits[1].split(".");
            appName = splits[0];
            modelName = splits[1];
            var do_toggle = (function(model) {
                return function() {
                    $("#qbeModelItem_" + model).toggleClass("selected");
                };
            })(modelName);
            do_toggle();
            var update_everything = function() {
                qbe.Core.updateModels();
                qbe.Diagram.repaintAll();
                //Set the last row to the newly added model if it is empty
                if (!$('.qbeFillModels:last').val()) {
                    $('.qbeFillModels:last').val(appName + "." + modelName).change();
                }
                return false;
            };
            if ($("#qbeModelItem_" + modelName).hasClass("selected")) {
                qbe.Core.addModule(appName, modelName);
            } else {
                var vmodel = qbe.Core.getVerboseName(appName, modelName);
                var should_remove = new Confirm("You are using the model \"" + vmodel + "\" in your report. " +
                "Are you sure you want to remove it?");

                should_remove.ok_callback = function() {
                    should_remove.close();
                    qbe.Core.removeModule(appName, modelName);
                    update_everything();
                };

                should_remove.cancel_callback = function() {
                    should_remove.close();
                    do_toggle();
                    update_everything();
                };

                should_remove.run();

            }
            update_everything();
            return false;
        };

        /**
         * Invokes the update of the each row
         */
        qbe.Core.updateModels = function() {
            $(this).each(qbe.Core.updateRow);
        };

        qbe.Core.getVerboseName = function(app, model) {
            try{
                return qbe.Models[app][model].verbose_name;
            }catch(e){
                return model;
            }
        };

        /**
         * Update the rows with the new models added
         */
        qbe.Core.updateRow = function(row) {
            var options = [];
            for (var i = 0; i < qbe.CurrentModels.length; i++) {
                var appModel = qbe.CurrentModels[i];
                var split = appModel.split('.');
                var verbose_name = qbe.Core.getVerboseName(split[0], split[1]);
                var key = appModel;
                options.push('<option value="' + key + '">' + verbose_name + '</option>');
            }
            $(".qbeFillModels").each(function() {
                var val = $(this).val();
                if (val && qbe.CurrentModels.indexOf(val) === -1) {
                    $(this).parents('tr:first').children('td.delete').children('a').click();
                }
                $(this).html(options.join(""));
                $(this).val(val);
            });
            qbe.Core.alternatingRows();
            add_labelauty($('input[type=checkbox]').not('.labelauty'));

            qbe.Core.addMultipleValueInput();

        };

        qbe.Core.getMultipleInputBtn = function() {
            return $('<a>').addClass('multivalue_popup').text(' Add Values').click(function () {
                var destination = $(this).prev('input');
                var overlay = new LightOverlay({
                    maximize: true,
                    minimize: true,
                    resize: true
                });
                overlay.title = 'Multiple Values';

                var textarea = $('<textarea>').attr('placeholder', 'Enter one value per line')
                    .addClass('multi_value_input')
                    .val(destination.val().replaceAll(',', '\n'));

                overlay.set_html(textarea);
                overlay.on_close = function () {
                    destination.val(textarea.val().replaceAll('\n', ','));
                };
                overlay.open();
            });
        };

        qbe.Core.addMultipleValueInput = function() {
            $('.cell_criteria').each(function(){
                $(this).removeClass('cell_criteria');
                $(this).children('select').change(function(){
                    if ($(this).val() === "in") {
                        $(this).next('input').prop('readonly', true).after(qbe.Core.getMultipleInputBtn());
                    }else{
                        $(this).next('input').prop('readonly', false);
                        $(this).nextAll('a.multivalue_popup').remove();
                    }
                });
            })
        };

        /**
         * Set a CSS class for alterned rows
         */
        qbe.Core.alternatingRows = function() {
            var rows = "#qbeConditionsTable tbody tr";
            $(rows).not(".add-row").removeClass("row1 row2");
            $(rows + ":even").not(".add-row").addClass("row1");
            $(rows + ":odd").not(".add-row").addClass("row2");
            $(rows + ":last").addClass("add-row");
        };

        /**
         * Add rows per new relation with the models list hyphen separated
         */
        qbe.Core.addRelationsFrom = function(through) {
            var appModels;
            appModels = through.split("-");
            for (var i = 0; i < appModels.length; i++) {
                var appModel = appModels[i];
                var splits = appModel.split(".");
                qbe.Core.addModule(splits[0], splits[1]);

                if ($('.qbeFillModels option[value=\'' + splits[0] + '.' + splits[1] + '\']').length)
                    return;

                $("#qbeModelItem_" + splits[1]).addClass("selected");
                $("#qbeForm .add-row").click();
                $(".qbeFillModels:last").val(splits[0] + "." + splits[1]);
                $(".qbeFillModels:last").change();
                $(".qbeFillFields:last").val(splits[2]);
                $(".qbeFillFields:last").change();
            }
        };

        /**
         * Event triggered when the SELECT tag for fill models is changed
         */
        qbe.Core.fillModelsEvent = function() {
            var appModel, key, fields, splits, appModelSplits, prefix, css, cssSplit, domTo, option, optFields, optPrimaries, optForeigns, optManies, style, value;
            appModel = $(this).val();
            if (appModel) {
                appModelSplits = appModel.split(".");
                fields = qbe.Models[appModelSplits[0]][appModelSplits[1]].fields;
                splits = $(this).attr("id").split("-");
                prefix = splits.splice(0, splits.length - 1).join("-");
                css = $(this).attr("class");
                cssSplit = css.split("to:");
                domTo = prefix + "-" + cssSplit[cssSplit.length - 1];
                optFields = [];
                optPrimaries = [];
                optForeigns = [];
                optManies = [];
                for (key in fields) {
                    // We can't jump fields with no target 'cause they are
                    // ManyToManyField and ForeignKey fields!
                    value = fields[key].label;
                    if (fields[key].type == "ForeignKey" || fields[key].type == "OneToOneField") {
                        style = "foreign";
                        option = '<option class="' + style + '" value="' + key + '">' + value + '</option>';
                        optForeigns.push(option);
                    } else if (fields[key].type == "ManyToManyField") {
                        style = "many";
                        option = '<option class="' + style + '" value="' + key + '">' + value + '</option>';
                        optManies.push(option);
                    } else if (fields[key].primary) {
                        style = "primary";
                        option = '<option class="' + style + '" value="' + key + '">' + value + '</option>';
                        optPrimaries.push(option);
                    } else {
                        style = "";
                        option = '<option class="' + style + '" value="' + key + '">' + value + '</option>';
                        optFields.push(option);
                    }
                }
                $("#" + domTo).html('<option value="">----</option>' + optPrimaries.join("") + optForeigns.join("") + optManies.join("") + optFields.join(""));
                // We need to raise change event
                $("#" + domTo).change();
            }
        };

        /**
         * Event triggered when the SELECT tag for fill fields is changed
         */
        qbe.Core.fillFieldsEvent = function() {
            var field, splits, prefix, css, cssSplit, inputs, input, domTo, appModel, appModelSplits, fields, primary, target, targetRel, targetModel, targetStrings, targetString, relations;
            field = $(this).val();
            splits = $(this).attr("id").split("-");
            prefix = splits.splice(0, splits.length - 1).join("-");
            css = $(this).attr("class");
            cssSplit = css.split("enable:");
            inputs = cssSplit[cssSplit.length - 1].split(",");
            for (var i = 0; i < inputs.length; i++) {
                input = inputs[i];
                domTo = prefix + "-" + input;
                if (field) {
                    $("#" + domTo).removeAttr("disabled");
                } else {
                    $("#" + domTo).attr("disabled", "disabled");
                    $("#" + domTo).val("");
                }
                if ($("#" + domTo).is(':input')) {
                    appModel = $("#" + prefix + "-model").val();
                    if (appModel) {
                        appModelSplits = appModel.split(".");
                        fields = qbe.Models[appModelSplits[0]][appModelSplits[1]].fields;
                        if (field in fields && fields[field].target && !_loadingData) {
                            target = fields[field].target;
                            if (target.through) {
                                $(this).parent().parent().children("td:last").children("a").click();
                                targetModel = qbe.Models[target.through.name][target.through.model];
                                targetsString = [];
                                relations = targetModel.relations;
                                for (var r = 0; r < targetModel.relations.length; r++) {
                                    targetRel = targetModel.relations[r];
                                    targetString = target.through.name + "." + target.through.model + "." + targetRel.source;
                                    targetsString.push(targetString);
                                }
                                qbe.Core.addRelationsFrom(targetsString.join("-"));
                            } else {
                                targetString = target.name + "." + target.model + "." + target.field;
                                $("#" + domTo).val(targetString);
                                $("#" + domTo).prev().val("join");
                                qbe.Core.addRelationsFrom(targetString);
                            }
                        } else {
                            $("#" + domTo).val("");
                        }
                    }
                }
            }


            var field_type = '';
            try {
                field_type = qbe.Models[appModelSplits[0]][appModelSplits[1]].fields[field].type.toLowerCase();
            } catch (e) {}

            if (typeof qbe.pickers === 'undefined') {
                qbe.pickers = [];
            }

            var filter_select = $('#' + domTo).prev();
            filter_select.parent().children().show();
            filter_select.find('option[value=join]').remove();
            filter_select.prev('.join_lbl').remove();
            filter_select.parents('tr:first').children('td:first').find('label').show();
            $('#' + prefix + '-sort').show();


            // First destroy any special field changes
            // Destroy the date picker
            if (typeof qbe.pickers[domTo] !== 'undefined' && qbe.pickers[domTo] !== null)
                qbe.pickers[domTo].destroy();
            qbe.pickers[domTo] = null;

            filter_select.find('option[value=in]').hide();
            filter_select.parents('tr:first').find('td:first label').show();

            // Destroy the boolean dropdown
            var criteria_field = $('#' + domTo);

            // Remove timefield
            criteria_field.filter('.time_input').removeClass('time_input').unbind('change').next('span').remove();

            // Remove boolfield
            criteria_field.prev('.bool_lbl').remove();
            if (criteria_field.hasClass('bool_select')) {
                criteria_field.replaceWith(
                    $('<input>').attr({
                        'type': 'text',
                        'name': criteria_field.attr('name'),
                        'id': criteria_field.attr('id')
                    })
                );
            }

            if (field_type === 'foreignkey' || field_type == "onetoonefield") {
                var filter_select = $('#' + domTo).prev();
                if (filter_select.has('option[value=join]').length == 0) {
                    filter_select.append($('<option>').attr('value', 'join').text('joins to'));
                }
                filter_select.val('join').next('input').hide();
                var jointo_model = filter_select.parents('tr:first').find('.qbeFillFields > :selected').text();
                filter_select.parents('tr:first').find('td:first input').prop('checked', null).next().hide();
                filter_select.children().not('[value=None], [value=join]').hide();
                filter_select.children('[value=join]').append(' ' + jointo_model);
                filter_select.children('[value=None]').html('has no ' + jointo_model);

            } else if (field_type.indexOf('date') !== -1) {
                var picker = new Pikaday({
                    field: document.getElementById(domTo),
                    format: 'YYYY-MM-DD'
                });
                qbe.pickers[domTo] = picker;

            // Or add the boolean dropdown
            } else if(field_type.indexOf('bool') !== -1) {
                var text_input = $('#' + domTo);
                filter_select.hide();
                text_input.replaceWith(
                    $('<select>').append(
                        $('<option>').attr('value', '').text('is True or False')
                    ).append(
                        $('<option>').attr('value', '1').text('is True')
                    ).append(
                        $('<option>').attr('value', '0').text('is False')
                    ).attr({
                        'name': text_input.attr('name'),
                        'id': text_input.attr('id')
                    }).change(function(){
                        filter_select.val($(this).val().length ? 'exact' : '');
                    }).change().addClass('bool_select').before(
                        $('<strong>').text('is equal to').addClass('bool_lbl')
                    )
                )
            } else if(field_type == 'timefield'){
                var text_input = $('#' + domTo).change(function(){
                    var parts = $(this).val().split(':');
                    var text_input = $(this);
                    ['hour', 'minute'].forEach(function(field, i){
                        if (parts[i] != undefined && !isNaN(parts[i]))
                            text_input.next().children('.' + field + '_select').val(parseInt(parts[i]));
                    });

                }).addClass('time_input').hide();

                var wrap = $('<span>');

                var hours = $('<select>').addClass('hour_select');
                for (var i = 0; i < 24; i++)
                    hours.append($('<option>').attr('value', i).html(('0' + i).slice(-2)));

                var minutes = $('<select>').addClass('minute_select');
                for (var i = 0; i < 60; i++)
                    minutes.append($('<option>').attr('value', i).html(('0' + i).slice(-2)));

                wrap.append(hours).append($('<strong>').html(' : ')).append(minutes).change(function(){
                    $(this).prev().val(
                        hours.val() + ':' + minutes.val() + ':00'
                    );
                });
                text_input.after(wrap);
            }else{
                filter_select.find('option[value=in]').show();
            }
            filter_select.change();
        };

        /**
         * Adds a model to the layer
         */
        qbe.Core.addModule = function(appName, modelName) {
            if (appName && modelName && appName) {
                var appModel, model, target1, target2;
                model = qbe.Models[appName][modelName];
                appModel = appName + "." + modelName;
                if ($.inArray(appModel, qbe.CurrentModels) < 0) {
                    qbe.CurrentModels.push(appModel);
                    if (model.is_auto) {
                        target1 = model.relations[0].target;
                        target2 = model.relations[1].target;
                        qbe.Core.addModule(target1.name, target1.model);
                        qbe.Core.addModule(target2.name, target2.model);
                    } else {
                        qbe.Diagram.addBox(appName, modelName);
                    }
                    qbe.Core.updateRelations();
                }
            }
        };

        /*
         * Removes a model from the layer
         */
        qbe.Core.removeModule = function(appName, modelName) {
            var appModel = appName + "." + modelName;
            var pos = qbe.CurrentModels.indexOf(appModel);
            if (pos >= 0) {
                qbe.CurrentModels.splice(pos, 1);
                var model = qbe.Models[appName][modelName];
                qbe.Diagram.removeBox(appName, modelName);
                qbe.Diagram.removeRelations(appName, modelName);
            }
        };

        /*
         * Update relations among models
         */
        qbe.Core.updateRelations = function() {
            var label, labelStyle, paintStyle, backgroundPaintStyle, makeOverlay;
            var relations, relation, mediumHeight, connections;
            var sourceAppModel, sourceModelName, sourceAppName, sourceModel, sourceFieldName, sourceId, sourceField, sourceSplits, divSource;
            var targetModel, targetAppName, targetModelName, targetFieldName, targetId, targetField, divTarget;
            for (var i = 0; i < qbe.CurrentModels.length; i++) {
                sourceAppModel = qbe.CurrentModels[i];
                sourceSplits = sourceAppModel.split(".");
                sourceAppName = sourceSplits[0];
                sourceModelName = sourceSplits[1];
                sourceModel = qbe.Models[sourceAppName][sourceModelName];
                relations = sourceModel.relations;
                for (var j = 0; j < relations.length; j++) {
                    relation = relations[j];
                    sourceFieldName = relation.source;
                    label = qbe.Diagram.Defaults["foreign"].label;
                    labelStyle = qbe.Diagram.Defaults["foreign"].labelStyle;
                    paintStyle = qbe.Diagram.Defaults["foreign"].paintStyle;
                    makeOverlays = qbe.Diagram.Defaults["foreign"].makeOverlays;
                    backgroundPaintStyle = qbe.Diagram.Defaults["foreign"].backgroundPaintStyle;
                    if (relation.target.through) {
                        if (qbe.Models[relation.target.through.name][relation.target.through.model].is_auto) {
                            targetModel = relation.target;
                            label = relation.target.through.model;
                            labelStyle = qbe.Diagram.Defaults["many"].labelStyle;
                            paintStyle = qbe.Diagram.Defaults["many"].paintStyle;
                            makeOverlays = qbe.Diagram.Defaults["many"].makeOverlays;
                            backgroundPaintStyle = qbe.Diagram.Defaults["many"].backgroundPaintStyle;
                        } else {
                            targetModel = relation.target.through;
                        }
                    } else {
                        targetModel = relation.target;
                    }
                    targetAppName = targetModel.name;
                    targetModelName = targetModel.model;
                    targetFieldName = targetModel.field;
                    sourceField = $("#qbeBoxField_" + sourceAppName + "\\." + sourceModelName + "\\." + sourceFieldName);
                    targetField = $("#qbeBoxField_" + targetAppName + "\\." + targetModelName + "\\." + targetFieldName);
                    if (sourceField.length && targetField.length &&
                        !qbe.Diagram.hasConnection(sourceField, targetField)) {
                        sourceId = "qbeBox_" + sourceModelName;
                        targetId = "qbeBox_" + targetModelName;
                        divSource = document.getElementById(sourceId);
                        divTarget = document.getElementById(targetId);
                        if (divSource && divTarget) {
                            qbe.Diagram.addRelation(sourceId, sourceField, targetId, targetField, label, labelStyle, paintStyle, backgroundPaintStyle, makeOverlays());
                        }
                    }
                }
            }
        };
    });

})($);
