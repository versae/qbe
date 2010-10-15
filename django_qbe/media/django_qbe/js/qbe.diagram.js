qbe.Diagram = {};

(function($) {
    $(document).ready(function() {
        var divBoxAnchor = $("#qbeBoxAnchor");
        jsPlumb.Defaults.DragOptions = { cursor: 'pointer', zIndex:2000 };
//        // default to blue at one end and green at the other
//        jsPlumb.Defaults.EndpointStyles = [{ fillStyle:'#225588' }, { fillStyle:'#558822' }];
//        // blue endpoints 7 px; green endpoints 11.
        jsPlumb.Defaults.Endpoints = [ new jsPlumb.Endpoints.Dot({radius:0}), new jsPlumb.Endpoints.Dot({radius:0})];
        // default to a gradient stroke from blue to green.  for IE provide all green fallback.
        jsPlumb.Defaults.PaintStyle = { strokeStyle:'#fff', lineWidth:0 };

        qbe.Diagram.addBox = function (appName, modelName) {
            var model, root, divBox, divTitle, fieldName, field, divField;
            model = qbe.Models[appName][modelName];
            root = $("#qbeDiagram");
            divBox = $("<DIV>");
            divBox.attr("id", "qbeBox_"+ modelName);
            divBox.css({
                "left": (Math.random() * 150 + 1)+ "px",
                "top": (Math.random() * 250 + 1)+ "px"
            });
            divBox.attr();
            divBox.addClass("body");
            divTitle = $("<DIV>");
            divTitle.addClass("title");
            divTitle.html(modelName);
            divBox.append(divTitle);
            for(fieldName in model.fields) {
                field = model.fields[fieldName];
                divField = $("<DIV>");
                divField.addClass("field");
                if (field.primary) {
                    divField.addClass("primary");
                } else if (field.type == "ForeignKey") {
                    divField.addClass("foreign");
                }
                divField.html(field.label);
                divBox.append(divField);
            }
            root.append(divBox);
            divBoxAnchor.plumb({target: "qbeBox_"+ modelName});
        };

//        jsPlumb.connect({source:'window1', target:'window3', anchors:[jsPlumb.makeAnchor( 0.05, 1, 0, 1 ), jsPlumb.Anchors.TopCenter], connector:new jsPlumb.Connectors.Straight()});
//        jsPlumb.connect({source:'window1', target:'window4', anchors:[jsPlumb.Anchors.BottomCenter, jsPlumb.Anchors.TopCenter]});
//        jsPlumb.connect({source:'window1', target:'window6', anchors:[jsPlumb.makeAnchor( 0.95, 1, 0, 1 ), jsPlumb.Anchors.TopCenter]});
//        jsPlumb.connect({source:'window1', target:'window5', anchors:[jsPlumb.makeAnchor( 0.275, 1, 0, 1 ), jsPlumb.Anchors.TopCenter]});
//        jsPlumb.connect({source:'window1', target:'window2', anchors:[jsPlumb.makeAnchor( 0.725, 1, 0, 1 ), jsPlumb.Anchors.TopCenter]});
    });
})(jQuery.noConflict());
