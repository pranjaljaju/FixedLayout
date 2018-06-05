
var Map = require('../../app/commonscripts/ctmap').Map;
var Util = require('../../app/commonscripts/utilities');
angular.module("klera").factory('dragdropManager', ['logService', 'container', 'layoutManager', 'sessionManager', 'floor', '$rootScope',
    function (logService, Container, layoutManager, sessionManager, Floor, $rootScope) {

        var dragTimerTop = 0;
        var dragTimerDown = 0;

        var onDragstart = function (ev) {
            Util.CommonUtils.makeChangesBeforeDragStart();
            ev = ev || window.event;
            var isdragRequired = checkIfDragRequired(ev.target);
            if (isdragRequired) {
                if (ev.target.id != null && ev.target.id != "") {
                    var componentInfo = Util.GetComponentIdFromDragImageId(ev.target.id);
                    var componentId = null;
                    var componentType = null;
                    var itemPerRow = 5;
                    var dragElementInfoList = [];
                    if (null != componentInfo) {
                        componentId = componentInfo.componentId;
                        componentType = componentInfo.type;
                    }
                    $(".k-animation-container").slideUp('fast');

                    //if Tab is dragged from Panel
                    if ($(ev.target).attr("data-target-id")) {
                        componentId = $(ev.target).attr("data-target-id");
                        var scope = Util.GetElementScope(componentId).vm;
                        if (scope) {
                            componentType = scope.type;
                        }
                    }

                    if (componentId) {
                        if (ev.stopPropagation) {
                            ev.stopPropagation(); // stops the browser from redirecting.
                        }
                        var floorID = $rootScope.floorId;
                        var floorScope = Util.GetElementScope(floorID).vm;
                        floorScope.cloneSourceContainers();
                        floorScope.setDraggingState(true);

                        var component = null;
                        var componentScope = Util.GetElementScope(componentId);
                        switch (componentType) {
                            case Util.CI.ComponentType.Container:
                                component = Container.getContainer(componentId);
                                if (component.canDrag === false) {
                                    ev.preventDefault();
                                    return false;
                                }
                                break;
                        }

                        //------------IF we are dragging a container , delete option must be displayed as well as created--

                        if (component) {
                            var dragElementInfo = new Util.CI.DragElementInfo(component.componentId,
                                component.componentType,
                                component.top,
                                component.left,
                                component.width,
                                component.height,
                                component.minWidth,
                                component.minHeight,
                                component.pinState,
                                true
                            );
                            dragElementInfoList.push(dragElementInfo);

                            /*--------end creating parent object-------------*/

                            var dragInfo = new Util.CI.DragInfo(dragElementInfoList, componentScope.$parent.vm.id, null, componentScope.$parent.vm.type);
                            dragInfo.sourceExplorationClientSessionId = $rootScope.explorationClientSessionId;
                            try {
                                floorScope.broadCastCopyCurrentPageInfo();
                                floorScope.broadCastSetViewFrameCover();
                                layoutManager.MoveStart(dragInfo, mouseCoords(ev));
                                var strLayoutData = JSON.stringify(dragInfo);
                                Util.stateCache.Set("layoutData", strLayoutData);

                                hideDragElement(dragInfo);

                                var elementArray = dragInfo.DragElementsList;
                                for (var index = 0; index < elementArray.length; index++) {
                                    if (elementArray[index].pinState == Util.CI.PinState.Card) {
                                        cardviewManager.removeSingleComponentFromCard(elementArray[index].ComponentId, elementArray[index].ComponentType, false);
                                        elementArray[index].pinState = Util.CI.PinState.Normal;
                                    }
                                }

                                var strDragInfo = JSON.stringify(dragInfo);
                                //Required to set data in firefox to have further drag events.
                                ev.dataTransfer.setData("text", "dragInfo");
                                ev.dataTransfer.effectAllowed = "move";
                                Util.stateCache.Set("dragInfo", strDragInfo);
                                Util.stateCache.Set("destComponentId", null);
                                Util.stateCache.Set("destComponentType", null);
                            } catch (err) {
                                logService.LogMessage("[dragdrop-manager] onDragstart: Error occured while drag start, Error message: " + err.message + " \nException: " + err.stack, logService.LogLevel.Error);
                                logService.LogMessage("[dragdrop-manager] Error description:  Event type: " + ev.type + " dragInfo: ", dragInfo, logService.LogLevel.Error);
                            }
                        }
                        Util.setDragFeedbackElement(ev, dragElementInfoList, 5, itemPerRow);
                    } else {
                        ev.stopImmediatePropagation();
                        ev.preventDefault();
                        ev.stopPropagation();
                        return false;
                    }
                } else {
                    ev.stopImmediatePropagation();
                    ev.preventDefault();
                    ev.stopPropagation();
                    return false;
                }
            }
        };

        var mouseCoords = function (ev) {
            if (ev.pageX || ev.pageY) {
                return {
                    x: ev.pageX,
                    y: ev.pageY
                };
            }
            return {
                x: ev.clientX + document.body.scrollLeft - document.body.clientLeft,
                y: ev.clientY + document.body.scrollTop - document.body.clientTop
            };
        };

        var onDrop = function (ev) {
            ev = ev || window.event;
            var isdragRequired = checkIfDragRequired(ev.target);
            var index;
            if (isdragRequired) {
                var floorScope = Util.GetElementScope($rootScope.floorId).vm;
                if (floorScope) {
                    floorScope.broadCastRemoveCustomScrollerDiv();
                    floorScope.broadCastRemoveDragDropOverLayDiv();
                }
                logService.LogMessage("[dragdrop-manager] onDrop", logService.LogLevel.Info);
                if (ev.preventDefault) {
                    ev.preventDefault(); // Necessary. Allows us to drop.
                }
                var layoutData = updateLayoutData(ev);
                if (layoutData.sourceExplorationClientSessionId != undefined && layoutData.sourceExplorationClientSessionId != $rootScope.explorationClientSessionId) {
                    return;
                }
                var dragData = Util.stateCache.Get("dragInfo");

                if (dragData) {
                    var dragInfo = JSON.parse(dragData);
                    var dragComponent = getDragComponentFromDragInfo(dragInfo);
                    if (dragComponent.ComponentType === Util.CI.ComponentType.Template) {
                        handleDropForTemplate(ev, dragInfo);
                    } else {
                        var componentID = layoutData.destComponentId;
                        var componentType = layoutData.destComponentType;
                        var curr_target = ev.target;
                        dragInfo.destComponentId = componentID;
                        dragInfo.destComponentType = componentType;
                        var cardHoverState = false;
                        if (dragInfo.destComponentId != null && dragInfo.destComponentId != "null") {
                            // checking for component that dropped onto Panel and set pinState to 
                            // Card view so it will be used in Dragend to send this component into Card view
                            cardHoverState = checkPanelHoverCondition(curr_target);
                        }
                        var strDragInfo = JSON.stringify(dragInfo);

                        try {
                            var isValidDrop = false;
                            var destId = null;
                            var returnVal = layoutManager.OnDrop(layoutData, mouseCoords(ev), cardHoverState);
                            isValidDrop = returnVal[0];
                            destId = returnVal[1];
                            var destContainerId = returnVal[2];
                            var layoutResult = returnVal[3];

                            if (isValidDrop) {
                                Util.stateCache.Set("dragInfo", strDragInfo);
                                Util.stateCache.Set("destComponentId", componentID);
                                Util.stateCache.Set("destComponentType", componentType);
                                Util.stateCache.Set("destContainerId", destContainerId);
                                Util.stateCache.Set("sourceScreenInfo", layoutResult.sourceScreenInfo);
                                Util.stateCache.Set("targetScreenInfo", layoutResult.targetScreenInfo);
                            } else {
                                Util.stateCache.Set("dragInfo", strDragInfo);
                                Util.stateCache.Set("destComponentId", "");
                                Util.stateCache.Set("destComponentType", "");
                                Util.stateCache.Set("destContainerId", "");
                                Util.stateCache.Set("destContainerId", destContainerId);
                                Util.stateCache.Set("sourceScreenInfo", "");
                                Util.stateCache.Set("targetScreenInfo", "");
                            }
                            showDragElement(dragInfo);
                        } catch (err) {
                            logService.LogMessage("[dragdrop-manager] onDrop: Error occured while droping component,  Error message: " + err.message + " \nException: " + err.stack, logService.LogLevel.Error);
                            logService.LogMessage("[dragdrop-manager] Error description:  Event type: " + ev.type, logService.LogLevel.Error);
                        }
                    }
                }
            }
        };

        var onDragend = function (ev) {
            ev = ev || window.event;
            var isdragRequired = checkIfDragRequired(ev.target);
            if (isdragRequired) {
                var floorScope = Util.GetElementScope($rootScope.floorId).vm;
                if (floorScope) {
                    floorScope.broadCastRemoveCustomScrollerDiv();
                    floorScope.broadCastRemoveDragDropOverLayDiv();
                    floorScope.broadCastRemoveViewFrameCover();
                    floorScope.clearSourceContainers();
                    floorScope.setDraggingState(false);
                }

                logService.LogMessage("[dragdrop-manager] onDragend", logService.LogLevel.Info);

                if (ev.preventDefault) {
                    ev.preventDefault(); // Necessary. Allows us to drop.
                }
                var index;
                var dragData = Util.stateCache.Get("dragInfo");
                if (dragData) {
                    var dragInfo = JSON.parse(dragData);
                    showDragElement(dragInfo);

                    dragInfo.destComponentId = Util.stateCache.Get("destComponentId");
                    dragInfo.destComponentType = Util.stateCache.Get("destComponentType");
                    dragInfo.destContainerId = Util.stateCache.Get("destContainerId");

                    var isAcrossFloor = false;
                    var doSendLayoutChange = false;
                    //Handle different drop condition
                    if (dragInfo.destComponentId && dragInfo.destComponentId != "null") {
                        if (dragInfo.sourceComponentId == dragInfo.destComponentId) {
                            isAcrossFloor = false;
                            doSendLayoutChange = true;
                        } else {
                            isAcrossFloor = true;
                            doSendLayoutChange = false;
                        }
                    }

                    var sourceScreenInfo, targetScreenInfo;
                    try {
                        var layoutInfo = JSON.parse(Util.stateCache.Get("layoutData"));
                        sourceScreenInfo = layoutManager.MoveEnd(layoutInfo, mouseCoords(ev), isAcrossFloor);
                        if (sourceScreenInfo !== null) {
                            Util.stateCache.Set("sourceScreenInfo", sourceScreenInfo);
                        }
                    } catch (err) {
                        logService.LogMessage("[dragdrop-manager] onDragend: Error occured while drag end, Error message: " + err.message + " \nException: " + err.stack, logService.LogLevel.Error);
                        logService.LogMessage("[dragdrop-manager] Error description:  Event type: " + ev.type + " layoutInfo: ", layoutInfo, logService.LogLevel.Error);
                    }

                    if (doSendLayoutChange) {
                        sourceScreenInfo = Util.stateCache.Get("sourceScreenInfo");
                        targetScreenInfo = Util.stateCache.Get("targetScreenInfo");
                        floorScope.sendLayoutChangeRelatedCommand(sourceScreenInfo, targetScreenInfo);
                    }
                }
            }
        };

        var onDragover = function (ev) {
            ev = ev || window.event;
            var isdragRequired = checkIfDragRequired(ev.target);
            if (isdragRequired) {
                if (ev.stopPropagation) {
                    ev.stopPropagation(); // stops the browser from redirecting.
                }
                if (ev.preventDefault) {
                    ev.preventDefault(); // Necessary. Allows us to drop.
                }
                var d = new Date();
                $rootScope.lastActiveTime = d.getTime(); // user is active

                var dragData = Util.stateCache.Get("dragInfo");

                if (dragData) {
                    var dragInfo = JSON.parse(dragData);
                    try {
                        var dragComponent = getDragComponentFromDragInfo(dragInfo);
                        if (dragComponent.ComponentType === Util.CI.ComponentType.Template) {
                            handleDragoverForTemplate(ev, dragInfo);
                        } else {
                            var layoutData = updateLayoutData(ev)
                            var isTargetSame = layoutManager.OnMoving(layoutData, mouseCoords(ev));
                            var overLayDiv = document.getElementById("klera_dragdrop_overlay_div");
                            if (layoutData.sourceExplorationClientSessionId != undefined && layoutData.sourceExplorationClientSessionId != $rootScope.explorationClientSessionId) {
                                Util.hideOverlayDiv();
                                Util.removeCustomScrollerDiv();
                            } else {
                                handleScreenScroll(ev.target.id, dragInfo);
                                if (overLayDiv.style.backgroundColor != "" && overLayDiv.style.display == "block") {
                                    ev.dataTransfer.dropEffect = 'none';
                                } else if (overLayDiv.style.backgroundColor == "" && overLayDiv.style.display == "block") {
                                    ev.dataTransfer.dropEffect = 'move';
                                }

                                if (isTargetSame == true) {
                                    var strDragInfo = JSON.stringify(dragInfo);
                                    Util.stateCache.Set("dragInfo", strDragInfo);
                                }
                            }
                        }
                    } catch (err) {
                        logService.LogMessage("[dragdrop-manager] onDragover: Error occured while drag over, Error message: " + err.message + " \nException: " + err.stack, logService.LogLevel.Error);
                        logService.LogMessage("[dragdrop-manager] Error description:  Event type: " + ev.type + " dragInfo: ", dragInfo, logService.LogLevel.Error);
                    }
                }

                return false;
            }
        };

        var handleDragoverForTemplate = function (event, dragInfo) {
            var templateOverLayDiv = $(".viewFrameCoverTemlate");
            var targetElem = event.target;
            var layoutData = updateLayoutData(event)
            if (layoutData.sourceExplorationClientSessionId != undefined && layoutData.sourceExplorationClientSessionId != $rootScope.explorationClientSessionId) {
                templateOverLayDiv.css('display', 'none');
                Util.removeCustomScrollerDiv();
            } else {
                var component = Util.IdentifyComponentFromID(targetElem)
                var cardHoverState = checkPanelHoverCondition(targetElem);
                if ((component != null && component.type != Util.CI.ComponentType.Floor) || cardHoverState) {
                    templateOverLayDiv.css('display', 'none');
                    event.dataTransfer.dropEffect = 'none';
                } else {
                    templateOverLayDiv.css('display', 'block');
                    event.dataTransfer.dropEffect = 'move';
                }
                handleScreenScroll(targetElem.id, dragInfo);
            }
        }

        var handleDropForTemplate = function (event, dragInfo) {
            var targetElem = event.target;
            var component = Util.IdentifyComponentFromID(targetElem)
            var cardHoverState = checkPanelHoverCondition(targetElem);
            if ((component != null && component.type != Util.CI.ComponentType.Floor) || cardHoverState) {
                Util.stateCache.Set("destComponentId", "");
            } else {
                Util.stateCache.Set("destComponentId", component.componentId);
            }
            var strDragInfo = JSON.stringify(dragInfo);
            Util.stateCache.Set("dragInfo", strDragInfo);
        }

        var handleScreenScroll = function (target, dragInfo) {
            var floorScope = Util.GetElementScope($rootScope.floorId).vm;
            if (target == Util.CI.CustomScrollerTopDiv) {
                if (dragTimerTop > 15) {
                    layoutManager.moveVerticalScrollUp(dragInfo);
                    hideDragElement(dragInfo);
                    if (floorScope) {
                        floorScope.addCustomScrollDiv();
                    }
                    dragTimerTop = 0;
                }
                dragTimerTop = dragTimerTop + 1;
            } else if (target == Util.CI.CustomScrollerBottomDiv) {
                if (dragTimerDown > 15) {
                    layoutManager.moveVerticalScrollDown(dragInfo);
                    hideDragElement(dragInfo);
                    if (floorScope) {
                        floorScope.addCustomScrollDiv();
                    }
                    dragTimerDown = 0;
                }
                dragTimerDown = dragTimerDown + 1;
            }
        };

        var dragEnterLeaveTimer = null;
        var settingId = null;
        var onDragenter = function (ev) {
            ev = ev || window.event;
            var isdragRequired = checkIfDragRequired(ev.target);
            if (isdragRequired) {
                var floorScope = Util.GetElementScope($rootScope.floorId).vm;
                if (floorScope) {
                    floorScope.broadCastSetCustomScrollerDiv();
                }
                settingId = ev.target.id;
                if (dragEnterLeaveTimer != null) {
                    clearTimeout(dragEnterLeaveTimer);
                    dragEnterLeaveTimer = null;
                }
                dragEnterLeaveTimer = setTimeout(function () {
                    dragEnterLeaveTimer = null;
                    if (ev.target.id.indexOf($rootScope.logicalScreenPanelContainerId) != -1) {
                        // viewPanelManager.OpenCard($rootScope.logicalScreenPanelContainerId);
                    } else {
                        floorScope.closeAllCardComponents();
                    }
                }, 250);
                if (ev.target.id == "appHome") {
                    try {
                        var layoutInfo = updateLayoutData(ev);
                        layoutManager.MoveEnter(layoutInfo, mouseCoords(ev));
                    } catch (err) {
                        logService.LogMessage("[dragdrop-manager] onDragenter: Error occured while drag enter, Error message: " + err.message + " \nException: " + err.stack, logService.LogLevel.Error);
                        logService.LogMessage("[dragdrop-manager] Error description:  Event type: " + ev.type + " layoutInfo: ", layoutInfo, logService.LogLevel.Error);
                    }

                }
            }
        };

        var onDragleave = function (ev) {
            ev = ev || window.event;
            var isdragRequired = checkIfDragRequired(ev.target);
            if (isdragRequired) {
                if (dragEnterLeaveTimer != null && settingId == ev.target.id) {
                    clearTimeout(dragEnterLeaveTimer);
                    dragEnterLeaveTimer = null;
                }
                if (ev.target.id == Util.CI.CustomScrollerBottomDiv) {
                    dragTimerDown = 0;
                }
                if (ev.target.id == Util.CI.CustomScrollerTopDiv) {
                    dragTimerTop = 0;
                }

                if (movedOutSideWindow(ev)) {
                    try {
                        var layoutInfo = updateLayoutData(ev);
                        layoutManager.MoveLeave(layoutInfo, mouseCoords(ev));
                    } catch (err) {
                        logService.LogMessage("[dragdrop-manager] onDragleave: Error occured while drag leave, Error message: " + err.message + " \nException: " + err.stack, logService.LogLevel.Error);
                        logService.LogMessage("[dragdrop-manager] Error description:  Event type: " + ev.type + " layoutInfo: ", layoutInfo, logService.LogLevel.Error);
                    }


                }
            }
        };

        var movedOutSideWindow = function (ev) {
            if (ev.target.id == "appHome" || ev.target.id == "htmlMain" || ev.target.id == $rootScope.floorId || ev.target.id.indexOf("GROUP") > -1) {
                return true;
            }
        }

        /*---------------function for managing visibility of dragged element-----------------*/

        var hideDragElement = function (dragInfo) {
            var elementArray = dragInfo.DragElementsList;
            for (var index = 0; index < elementArray.length; index++) {
                if (elementArray[index].dragFlag) {
                    var elem = document.getElementById(elementArray[index].ComponentId);
                    if (elem) {
                        elem.style.opacity = '0';
                    }
                }
            }
        };

        var showDragElement = function (dragInfo) {
            var elementArray = dragInfo.DragElementsList;
            for (var index = 0; index < elementArray.length; index++) {
                var elem = document.getElementById(elementArray[index].ComponentId);
                if (elem) {
                    elem.style.opacity = '1';
                }

            }
        };

        var updateLayoutData = function (event) {
            var layoutData = JSON.parse(Util.stateCache.Get("layoutData"));
            var component = Util.IdentifyComponentFromID(event.target);
            if (component && layoutData.destComponentId != component.componentId && component.type != 'CONTAINER') {
                layoutData.destComponentId = component.componentId;
                layoutData.destComponentType = component.type;
                layoutData.id = parseInt(layoutData.id) + 1;
                Util.stateCache.Set("layoutData", JSON.stringify(layoutData));
            }
            return layoutData;
        };

        function checkIfDragRequired(element) {
            var elem = $(element);

            //-------- drag for global view configuration 
            if (elem.closest("#globalConfigPanel").eq(0).length > 0) {
                return false;
            }
            if (elem.closest(".logicalscreenContainer").eq(0).length > 0) {
                return false;
            }

            return true;
        }

        function checkPanelHoverCondition(curr_target) {
            var isPanelElement = false;
            var currIdList = curr_target.id.split("_");
            var currid = currIdList[currIdList.length - 1];
            if (currid == "cardPanel" || currid == "productmenu") {
                isPanelElement = true;
            } else if ($(curr_target).parents("#cardPanel").length > 0) {
                isPanelElement = true;
            }
            return isPanelElement;
        };
        function getDragComponentFromDragInfo(dragInfo) {
            var elementArray = dragInfo.DragElementsList;
            var draggedContainer;
            for (var dragCount = 0; dragCount < elementArray.length; dragCount++) {
                if (elementArray[dragCount].dragFlag) {
                    draggedContainer = elementArray[dragCount];
                    break;
                }
            }
            return draggedContainer;
        }

        /*-------------End function for managing visibility of dragged element----------------*/

        return {
            OnDragstart: onDragstart,
            OnDrop: onDrop,
            OnDragend: onDragend,
            OnDragover: onDragover,
            OnDragenter: onDragenter,
            OnDragleave: onDragleave,
        };
    }
]);
