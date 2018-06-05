var Map = require('../../app/commonscripts/ctmap').Map;
var PageManager = require('../../app/services/page-manager');
var Util = require('../../app/commonscripts/utilities');
var Double = require('../../app/commonscripts/double').Double;
angular.module("klera").factory('layoutManager', ['logService', '$rootScope', 'sessionManager', 'floor', 'container', 'securityManager',
    function (logService, $rootScope, sessionManager, Floor, Container, securityManager) {
        var CurrentLogicalScreen = 0;
        var TotalAvailableLogicalScreen = 1;
        var logicalScreenHeight = 0;
        var logicalScreenWidth = 0;
        var parentComponentLayoutMap = new Map();
        var defaultOffsetFloor = 10;
        var defaultOffsetDashboard = 1;
        var resizeHandleTimer = -1;
        var bothSidedOffsetFloor = {
            left: 68,
            top: 10,
            right: 10,
            bottom: 38
        };
        var i = 0;
        var j = 0;
        var ResizeInfoObject;
        var componentIdsSeparator = ",";
        var DragDropInfoObject;
        var initialTime = 0;
        var CurrentLogicalScreenBeforeDragDrop = 0;
        var CurrentLogicalScreenAfterDragDrop = 0;
        var srcLogicalScreenIndex = -1;
        var targetLogicalScreenIndex = -1;
        var closestSplitterOffset = 10;
        var MAX_VAL = 999999;

        var reset = function () {
            CurrentLogicalScreen = 0;
            TotalAvailableLogicalScreen = 1;
            parentComponentLayoutMap = new Map();
            i = 0;
            j = 0;
            ResizeInfoObject = null;
            DragDropInfoObject = null;;
            initialTime = 0;
            CurrentLogicalScreenBeforeDragDrop = 0;
            CurrentLogicalScreenAfterDragDrop = 0;
            closestSplitterOffset = 10;
            srcLogicalScreenIndex = -1;
            targetLogicalScreenIndex = -1;
        };
        var getDefaultOffset = function (type) {
            return {
                offset: defaultOffsetFloor,
                bothSideOffset: bothSidedOffsetFloor
            };
        };

        var getLayout = function () {
            this.horSplittersSortedByTopLeft = [];
            this.vertSplittersSortedByLeftTop = [];
            this.components = [];
        };

        var onWindowResizeEvent = function () {
            var floorHeight = Util.CommonUtils.getFloorScreenSize();
            var floorWidth = Util.CommonUtils.getFloorScreenWidth();

            if (logicalScreenHeight == 0 && logicalScreenWidth == 0) {
                logicalScreenHeight = floorHeight;
                logicalScreenWidth = floorWidth;
            }

            logicalScreenHeight = floorHeight;
            logicalScreenWidth = floorWidth;

            var floor = Floor.getFloor($rootScope.floorId);
            floor.screenSize = floorHeight;
            floor.screenWidth = floorWidth;
            floor.width = floorWidth;
            floor.height = (TotalAvailableLogicalScreen) * floor.screenSize;
            Floor.updateModel(floor);

            repaintLayout();
            $("#appHome").mCustomScrollbar("scrollTo", CurrentLogicalScreen * floorHeight);
        };

        function HorSplitter(Width, Top, Left, TopComponentIds, BottomComponentIds) {
            this.Width = Width;
            this.Top = Top;
            this.Left = Left;
            this.TopComponentIds = TopComponentIds;
            this.BottomComponentIds = BottomComponentIds;

            this.getTopComponentCount = function () {
                if (TopComponentIds && TopComponentIds != "") {
                    return TopComponentIds.split(',').length;
                } else {
                    return 0;
                }
            };

            this.getBottomComponentCount = function () {
                if (BottomComponentIds && BottomComponentIds != "") {
                    return BottomComponentIds.split(',').length;
                } else {
                    return 0;
                }
            };

            this.getFirstSortKey = function () {
                return Top;
            };

            this.getSecondSortKey = function () {
                return Left;
            };
        }

        function VertSplitter(Height, Top, Left, LeftComponentIds, RightComponentIds) {
            this.Height = Height;
            this.Top = Top;
            this.Left = Left;
            this.LeftComponentIds = LeftComponentIds;
            this.RightComponentIds = RightComponentIds;

            this.getLeftComponentCount = function () {
                if (LeftComponentIds && LeftComponentIds != "") {
                    return LeftComponentIds.split(',').length;
                } else {
                    return 0;
                }
            };

            this.getRightComponentCount = function () {
                if (RightComponentIds && RightComponentIds != "") {
                    return RightComponentIds.split(',').length;
                }
                return 0;
            };

            this.getFirstSortKey = function () {
                return Left;
            };

            this.getSecondSortKey = function () {
                return Top;
            };
        }

        var setCurrentLogicalScreen = function (logicalScreenNumber, updateLogicalScreenPanel, isMoveForward) {
            logicalScreenNumber = validateMinMaxScreenValue(logicalScreenNumber);
            var floorScope = Util.GetElementScope($rootScope.floorId).vm;
            if (isMoveForward) {
                logicalScreenNumber = floorScope.getNextVisiblePageNumber(logicalScreenNumber + 1) - 1;
            } else {
                logicalScreenNumber = floorScope.getPrevVisiblePageNumber(logicalScreenNumber + 1) - 1;
            }
            if (logicalScreenNumber < 0) {
                logicalScreenNumber = 0;
            }

            CurrentLogicalScreen = logicalScreenNumber;
            var floorId = $rootScope.floorId;
            var floorModel = Floor.getFloor(floorId);

            floorScope.logicalScreendIndexUpdated(CurrentLogicalScreen, updateLogicalScreenPanel);

            var scrollToTop = CurrentLogicalScreen * floorModel.screenSize;
            $("#appHome").mCustomScrollbar("scrollTo", scrollToTop);
        };

        function validateMinMaxScreenValue(logicalScreenNumber) {
            if (logicalScreenNumber >= TotalAvailableLogicalScreen) {
                logicalScreenNumber = TotalAvailableLogicalScreen - 1;
            }
            if (logicalScreenNumber <= 0) {
                logicalScreenNumber = 0;
            }
            return logicalScreenNumber;
        }

        var setTotalLogicalScreen = function (logicalScreenNumber) {
            if (logicalScreenNumber <= 0) {
                logicalScreenNumber = 1;
            }
            TotalAvailableLogicalScreen = logicalScreenNumber;

            var floorId = $rootScope.floorId;
            var floorModel = Floor.getFloor(floorId);
            floorModel.height = TotalAvailableLogicalScreen * floorModel.screenSize;
            Floor.updateModel(floorModel);
            triggerEventForLogicalScreenCount(TotalAvailableLogicalScreen);
        };

        var moveLogicalScreenUpDown = function (moveByStep, screenSize) {
            var scrollToTop = 0;
            if (CurrentLogicalScreen + moveByStep >= 0 && (CurrentLogicalScreen + moveByStep) < (TotalAvailableLogicalScreen)) {
                var newScreenNo = CurrentLogicalScreen + moveByStep;
                var isMoveForward = true;
                if (moveByStep === -1) {
                    isMoveForward = false;
                }
                setCurrentLogicalScreen(newScreenNo, false, isMoveForward);
                return true;
            }
            return false;
        };

        var moveVerticalScrollUp = function () {
            var currentTime = new Date().getTime();
            if (currentTime > (initialTime + 500)) {
                var parentId = $rootScope.floorId;
                var screenSize = 0;
                if (Floor.getFloor(parentId)) {
                    screenSize = Floor.getFloor(parentId).screenSize;
                }
                if (moveLogicalScreenUpDown(-1, screenSize)) {
                    initialTime = currentTime;
                }
            }
        };

        var moveVerticalScrollDown = function () {
            var currentTime = new Date().getTime();
            if (currentTime > (initialTime + 500)) {
                var parentId = $rootScope.floorId;
                var screenSize = 0;
                if (Floor.getFloor(parentId)) {
                    screenSize = Floor.getFloor(parentId).screenSize;
                }
                if (moveLogicalScreenUpDown(1, screenSize)) {
                    initialTime = currentTime;
                }
            }
        };

        var getLogicalScreenLayoutFromScreenIndex = function (logicalScreenIndex) {
            var layoutKey = logicalScreenIndex + '_' + $rootScope.floorId;
            var floorLayoutstMap = new Map();
            var layout = parentComponentLayoutMap.get(layoutKey);
            return layout;
        }

        var getLogicalScreenLayoutfromComponent = function (componentId) {
            var layoutToBeReturned = null;
            if (parentComponentLayoutMap) {
                parentComponentLayoutMap.each(function (id, layout, index) {
                    if (id.indexOf("_") != -1) {
                        var logicalScreenComponents = layout.components;

                        for (var componentCounter = 0; componentCounter < logicalScreenComponents.length; componentCounter++) {
                            if (logicalScreenComponents[componentCounter].ComponentId == componentId) {
                                layoutToBeReturned = layout;
                                break;
                            }
                        }
                    }
                });
                return layoutToBeReturned;
            }
        };

        var getLogicalScreenLayoutComponents = function (screenNo) {
            var layoutToBeReturned = {};
            if (parentComponentLayoutMap) {
                var layoutId = screenNo + '_' + $rootScope.floorId;
                var layout = parentComponentLayoutMap.get(layoutId);
                if (layout) {
                    layout = JSON.parse(JSON.stringify(layout));
                    layoutToBeReturned[layoutId] = layout.components;
                }
            }
            return layoutToBeReturned;
        };

        var getLogicalScreenNumberfromComponent = function (componentId) {
            var logicalScreenNumber = -1;
            if (parentComponentLayoutMap) {
                parentComponentLayoutMap.each(function (id, layout, index) {
                    if (id.indexOf("_") != -1 && layout) {
                        var logicalScreenComponents = layout.components;

                        for (var componentCounter = 0; componentCounter < logicalScreenComponents.length; componentCounter++) {
                            if (logicalScreenComponents[componentCounter].ComponentId == componentId) {
                                logicalScreenNumber = parseInt(id.split('_')[0]);
                                break;
                            }
                        }
                    }
                });
            }
            return logicalScreenNumber;
        };

        var resizeInfoObject = function (Splitter, HandlerString, top, left) {
            this.Splitter = JSON.parse(JSON.stringify(Splitter));
            this.Top = top;
            this.Left = left;
            this.HandlerString = HandlerString;

            this.setTop = function (top) {
                this.Top = top;
            };
            this.setLeft = function (left) {
                this.Left = left;
            };
        };

        var dragDropInfoObject = function (layout, destinationContainer, overlayPosition, draggedContainer, parentComponentId, parentComponentType, defaultOffset) {
            this.layout = layout;
            this.destinationContainer = destinationContainer;
            switch (destinationContainer.ComponentType) {
                case Util.CI.ComponentType.Container:
                    this.destinationContainerMinWidth = Container.getContainer(destinationContainer.ComponentId).minWidth;
                    this.destinationContainerMinHeight = Container.getContainer(destinationContainer.ComponentId).minHeight;
                    break;
                default:
                    this.destinationContainerMinWidth = 0;
                    break;
            }
            this.overlayPosition = overlayPosition;
            this.draggedContainer = draggedContainer;

            if (!draggedContainer.MinWidth) {
                switch (draggedContainer.ComponentType) {
                    case Util.CI.ComponentType.Container:
                        this.draggedContainerMinWidth = Container.getContainer(draggedContainer.ComponentId).minWidth;
                        break;
                    default:
                        this.draggedContainerMinWidth = 0;
                        break;
                }
            } else {
                this.draggedContainerMinWidth = draggedContainer.MinWidth;
            }

            if (!draggedContainer.MinHeight) {
                switch (draggedContainer.ComponentType) {
                    case Util.CI.ComponentType.Container:
                        this.draggedContainerMinHeight = Container.getContainer(draggedContainer.ComponentId).minHeight;
                        break;
                    default:
                        this.draggedContainerMinWidth = 0;
                        break;
                }
            } else {
                this.draggedContainerMinHeight = draggedContainer.MinHeight;
            }

            this.parentComponentId = parentComponentId;
            this.parentComponentType = parentComponentType;
            this.defaultOffset = defaultOffset;
        };

        var insertElementSortedOnTwoKeys = function (sortedArrayHavingTwoSortKeys, itemToBeInsertedHavingTwoSortKeys, sortOrder) {
            var iInsertAtThisIndex = 0;

            if (!sortedArrayHavingTwoSortKeys ||
                !itemToBeInsertedHavingTwoSortKeys) {
                logService.LogMessage("[layout-manager] Invalid arguments", logService.LogLevel.Error);
                return false;
            }

            if (!sortOrder) {
                sortOrder = "A";
            }

            switch (sortOrder) {
                case "A":
                case "a":
                case "D":
                case "d":
                    break;
                default:
                    //USAGE : sortOrder <Ascending : A/a> <Descending : D/d>
                    logService.LogMessage("[layout-manager] Invalid Sort Order : " + sortOrder, logService.LogLevel.Error);
                    return false;
            }

            if (sortedArrayHavingTwoSortKeys) {
                if (sortedArrayHavingTwoSortKeys.length == 0) {
                    sortedArrayHavingTwoSortKeys.push(itemToBeInsertedHavingTwoSortKeys);
                    return true;
                }

                switch (sortOrder) {
                    case "A":
                    case "a":
                        for (iInsertAtThisIndex = 0; iInsertAtThisIndex < sortedArrayHavingTwoSortKeys.length &&
                            Double.lessWithPrecision(sortedArrayHavingTwoSortKeys[iInsertAtThisIndex].getFirstSortKey(), itemToBeInsertedHavingTwoSortKeys.getFirstSortKey()); iInsertAtThisIndex++) { }

                        for (; iInsertAtThisIndex < sortedArrayHavingTwoSortKeys.length &&
                            Double.equalWithPrecision(sortedArrayHavingTwoSortKeys[iInsertAtThisIndex].getFirstSortKey(), itemToBeInsertedHavingTwoSortKeys.getFirstSortKey()) &&
                            Double.lessWithPrecision(sortedArrayHavingTwoSortKeys[iInsertAtThisIndex].getSecondSortKey(), itemToBeInsertedHavingTwoSortKeys.getSecondSortKey()); iInsertAtThisIndex++) { }
                        break;
                    case "D":
                    case "d":
                        for (iInsertAtThisIndex = 0; iInsertAtThisIndex < sortedArrayHavingTwoSortKeys.length &&
                            Double.greaterWithPrecision(sortedArrayHavingTwoSortKeys[iInsertAtThisIndex].getFirstSortKey(), itemToBeInsertedHavingTwoSortKeys.getFirstSortKey()); iInsertAtThisIndex++) { }

                        for (; iInsertAtThisIndex < sortedArrayHavingTwoSortKeys.length &&
                            Double.equalWithPrecision(sortedArrayHavingTwoSortKeys[iInsertAtThisIndex].getFirstSortKey(), itemToBeInsertedHavingTwoSortKeys.getFirstSortKey()) &&
                            Double.greaterWithPrecision(sortedArrayHavingTwoSortKeys[iInsertAtThisIndex].getSecondSortKey(), itemToBeInsertedHavingTwoSortKeys.getSecondSortKey()); iInsertAtThisIndex++) { }
                        break;
                }
                sortedArrayHavingTwoSortKeys.splice(iInsertAtThisIndex, 0, itemToBeInsertedHavingTwoSortKeys);
                return true;
            }
            return false;
        };


        var insertElementSortedOnTwoInverseKeys = function (sortedArrayHavingTwoSortKeys, itemToBeInsertedHavingTwoSortKeys, sortOrder) {
            var iInsertAtThisIndex = 0;

            if (!sortedArrayHavingTwoSortKeys ||
                !itemToBeInsertedHavingTwoSortKeys) {
                logService.LogMessage("[layout-manager] Invalid arguments", logService.LogLevel.Error);
                return false;
            }

            if (!sortOrder) {
                sortOrder = "A";
            }

            switch (sortOrder) {
                case "A":
                case "a":
                case "D":
                case "d":
                    break;
                default:
                    //USAGE : sortOrder <Ascending : A/a> <Descending : D/d>
                    logService.LogMessage("[layout-manager] Invalid Sort Order : " + sortOrder, logService.LogLevel.Error);
                    return false;
            }

            if (sortedArrayHavingTwoSortKeys) {
                if (sortedArrayHavingTwoSortKeys.length == 0) {
                    sortedArrayHavingTwoSortKeys.push(itemToBeInsertedHavingTwoSortKeys);
                    return true;
                }

                switch (sortOrder) {
                    case "A":
                    case "a":
                        for (iInsertAtThisIndex = 0; iInsertAtThisIndex < sortedArrayHavingTwoSortKeys.length &&
                            Double.lessWithPrecision(sortedArrayHavingTwoSortKeys[iInsertAtThisIndex].getSecondSortKey(), itemToBeInsertedHavingTwoSortKeys.getSecondSortKey()); iInsertAtThisIndex++) { }

                        for (; iInsertAtThisIndex < sortedArrayHavingTwoSortKeys.length &&
                            Double.equalWithPrecision(sortedArrayHavingTwoSortKeys[iInsertAtThisIndex].getSecondSortKey(), itemToBeInsertedHavingTwoSortKeys.getSecondSortKey()) &&
                            Double.lessWithPrecision(sortedArrayHavingTwoSortKeys[iInsertAtThisIndex].getFirstSortKey(), itemToBeInsertedHavingTwoSortKeys.getFirstSortKey()); iInsertAtThisIndex++) { }
                        break;
                    case "D":
                    case "d":
                        for (iInsertAtThisIndex = 0; iInsertAtThisIndex < sortedArrayHavingTwoSortKeys.length &&
                            Double.greaterWithPrecision(sortedArrayHavingTwoSortKeys[iInsertAtThisIndex].getSecondSortKey(), itemToBeInsertedHavingTwoSortKeys.getSecondSortKey()); iInsertAtThisIndex++) { }

                        for (; iInsertAtThisIndex < sortedArrayHavingTwoSortKeys.length &&
                            Double.equalWithPrecision(sortedArrayHavingTwoSortKeys[iInsertAtThisIndex].getSecondSortKey(), itemToBeInsertedHavingTwoSortKeys.getSecondSortKey()) &&
                            Double.greaterWithPrecision(sortedArrayHavingTwoSortKeys[iInsertAtThisIndex].getFirstSortKey(), itemToBeInsertedHavingTwoSortKeys.getFirstSortKey()); iInsertAtThisIndex++) { }
                        break;
                }
                sortedArrayHavingTwoSortKeys.splice(iInsertAtThisIndex, 0, itemToBeInsertedHavingTwoSortKeys);
                return true;
            }
            return false;
        };

        var scanAndSort = function (layout) {
            var components = layout.components;
            for (var currentComponent = 0; currentComponent < components.length; currentComponent++) {
                var topHorSplitter = new HorSplitter(components[currentComponent].Width, components[currentComponent].Top, components[currentComponent].Left, "", components[currentComponent].ComponentId);
                var bottomHorSplitter = new HorSplitter(components[currentComponent].Width, components[currentComponent].Top + components[currentComponent].Height, components[currentComponent].Left, components[currentComponent].ComponentId, "");

                var leftVertSplitter = new VertSplitter(components[currentComponent].Height, components[currentComponent].Top, components[currentComponent].Left, "", components[currentComponent].ComponentId);
                var rightVertSplitter = new VertSplitter(components[currentComponent].Height, components[currentComponent].Top, components[currentComponent].Left + components[currentComponent].Width, components[currentComponent].ComponentId, "");

                insertElementSortedOnTwoKeys(layout.horSplittersSortedByTopLeft, topHorSplitter);
                insertElementSortedOnTwoKeys(layout.horSplittersSortedByTopLeft, bottomHorSplitter);

                insertElementSortedOnTwoKeys(layout.vertSplittersSortedByLeftTop, leftVertSplitter);
                insertElementSortedOnTwoKeys(layout.vertSplittersSortedByLeftTop, rightVertSplitter);
            }
        };

        var mergeHorSplitters = function (layout, defaultOffsetForLayout) {
            var tempArray = [];
            if (layout) {
                var horSplitter;
                var horSplitters = layout.horSplittersSortedByTopLeft;
                for (var count = 0; count < horSplitters.length; count++) {
                    horSplitter = new HorSplitter(horSplitters[count].Width, horSplitters[count].Top, horSplitters[count].Left, horSplitters[count].TopComponentIds, horSplitters[count].BottomComponentIds);

                    for (var counter = count + 1; counter < horSplitters.length && ((horSplitter.BottomComponentIds == "" && horSplitters[counter].BottomComponentIds == "") || (horSplitter.TopComponentIds == "" && horSplitters[counter].TopComponentIds == "")) && Double.equalWithPrecision(horSplitter.Top, horSplitters[counter].Top) && Double.equalWithPrecision(horSplitter.Left + horSplitter.Width + defaultOffsetForLayout, horSplitters[counter].Left); counter++) {
                        if (!(horSplitter.BottomComponentIds == "" && horSplitters[counter].BottomComponentIds == "") && !(horSplitter.TopComponentIds == "" && horSplitters[counter].TopComponentIds == "")) {
                            logService.LogMessage("[layout-manager] Horizontal splitter disaster!!!!", logService.LogLevel.Error);
                            //continue;
                        }

                        horSplitter.Width += horSplitters[counter].Width + defaultOffsetForLayout;

                        if (horSplitters[counter].TopComponentIds) {
                            if (horSplitter.TopComponentIds != "") {
                                horSplitter.TopComponentIds += componentIdsSeparator + horSplitters[counter].TopComponentIds;
                            } else {
                                horSplitter.TopComponentIds = horSplitters[counter].TopComponentIds;
                            }
                        }

                        if (horSplitters[counter].BottomComponentIds) {
                            if (horSplitter.BottomComponentIds != "") {
                                horSplitter.BottomComponentIds += componentIdsSeparator + horSplitters[counter].BottomComponentIds;
                            } else {
                                horSplitter.BottomComponentIds = horSplitters[counter].BottomComponentIds;
                            }

                        }
                        count++;
                    }
                    tempArray.push(horSplitter);
                }

                horSplitters = [];

                for (var count = 0; count < tempArray.length; count++) {
                    insertElementSortedOnTwoInverseKeys(horSplitters, tempArray[count]);
                }

                tempArray = [];

                for (var count = 0; count < horSplitters.length; count++) {
                    horSplitter = new HorSplitter(horSplitters[count].Width, horSplitters[count].Top, horSplitters[count].Left, horSplitters[count].TopComponentIds, horSplitters[count].BottomComponentIds);

                    var counter = count + 1;
                    while (counter < horSplitters.length &&
                        Double.equalWithPrecision(horSplitter.Left, horSplitters[counter].Left) &&
                        Double.equalWithPrecision(horSplitter.Top + defaultOffsetForLayout, horSplitters[counter].Top)) {
                        if (horSplitter.BottomComponentIds != "") {
                            horSplitter.BottomComponentIds += componentIdsSeparator + horSplitters[counter].BottomComponentIds;
                        } else {
                            horSplitter.BottomComponentIds = horSplitters[counter].BottomComponentIds;
                        }
                        horSplitters.splice(counter, 1);
                        counter++;
                    }
                    tempArray.push(horSplitter);
                }
            }

            layout.horSplittersSortedByTopLeft = [];

            for (var count = 0; count < tempArray.length; count++) {
                insertElementSortedOnTwoKeys(layout.horSplittersSortedByTopLeft, tempArray[count]);
            }
        };

        var mergeVertSplitters = function (layout, defaultOffsetForLayout) {
            var tempArray = [];
            if (layout) {
                var vertSplitter;
                var vertSplitters = layout.vertSplittersSortedByLeftTop;
                for (var count = 0; count < vertSplitters.length; count++) {
                    vertSplitter = new VertSplitter(vertSplitters[count].Height, vertSplitters[count].Top, vertSplitters[count].Left, vertSplitters[count].LeftComponentIds, vertSplitters[count].RightComponentIds);

                    for (var counter = count + 1; counter < vertSplitters.length && ((vertSplitter.LeftComponentIds == "" && vertSplitters[counter].LeftComponentIds == "") || (vertSplitter.RightComponentIds == "" && vertSplitters[counter].RightComponentIds == "")) && Double.equalWithPrecision(vertSplitter.Left, vertSplitters[counter].Left) && Double.equalWithPrecision(vertSplitter.Top + vertSplitter.Height + defaultOffsetForLayout, vertSplitters[counter].Top); counter++) {
                        if (!(vertSplitter.LeftComponentIds == "" && vertSplitters[counter].LeftComponentIds == "") &&
                            !(vertSplitter.RightComponentIds == "" && vertSplitters[counter].RightComponentIds == "")) {
                            logService.LogMessage("[layout-manager] Vertical splitter disaster!!!!", logService.LogLevel.Error);
                        }

                        vertSplitter.Height += vertSplitters[counter].Height + defaultOffsetForLayout;

                        if (vertSplitters[counter].LeftComponentIds) {
                            if (vertSplitter.LeftComponentIds != "") {
                                vertSplitter.LeftComponentIds += componentIdsSeparator + vertSplitters[counter].LeftComponentIds;
                            } else {
                                vertSplitter.LeftComponentIds = vertSplitters[counter].LeftComponentIds;
                            }

                        }

                        if (vertSplitters[counter].RightComponentIds) {
                            if (vertSplitter.RightComponentIds != "") {
                                vertSplitter.RightComponentIds += componentIdsSeparator + vertSplitters[counter].RightComponentIds;
                            } else {
                                vertSplitter.RightComponentIds = vertSplitters[counter].RightComponentIds;
                            }
                        }
                        count++;
                    }
                    tempArray.push(vertSplitter);
                }

                vertSplitters = [];

                for (var count = 0; count < tempArray.length; count++) {
                    insertElementSortedOnTwoInverseKeys(vertSplitters, tempArray[count]);
                }

                tempArray = [];

                for (var count = 0; count < vertSplitters.length; count++) {
                    vertSplitter = new VertSplitter(vertSplitters[count].Height, vertSplitters[count].Top, vertSplitters[count].Left, vertSplitters[count].LeftComponentIds, vertSplitters[count].RightComponentIds);

                    var counter = count + 1;
                    while (counter < vertSplitters.length &&
                        Double.equalWithPrecision(vertSplitter.Top, vertSplitters[counter].Top) &&
                        Double.equalWithPrecision(vertSplitter.Left + defaultOffsetForLayout, vertSplitters[counter].Left)) {
                        if (vertSplitter.RightComponentIds != "") {
                            vertSplitter.RightComponentIds += componentIdsSeparator + vertSplitters[counter].RightComponentIds;
                        } else {
                            vertSplitter.RightComponentIds = vertSplitters[counter].RightComponentIds;
                        }
                        vertSplitters.splice(counter, 1);
                        counter++;
                    }
                    tempArray.push(vertSplitter);
                }
            }

            layout.vertSplittersSortedByLeftTop = [];

            for (var count = 0; count < tempArray.length; count++) {
                insertElementSortedOnTwoKeys(layout.vertSplittersSortedByLeftTop, tempArray[count]);
            }
        };

        var breakHorAndVertSplittersAtIntersection = function (layout, defaultOffsetForLayout) {
            var horSplitters = layout.horSplittersSortedByTopLeft;
            var vertSplitters = layout.vertSplittersSortedByLeftTop;
            var bottomsplitComponentIds;
            var topsplitComponentIds;
            var leftsplitComponentIds;
            var rightsplitComponentIds;

            for (var count = 0; count < horSplitters.length; count++) {
                for (var counter = 0; counter < vertSplitters.length; counter++) {
                    if (Double.lessWithPrecision(vertSplitters[counter].Top, horSplitters[count].Top) &&
                        (Double.greaterWithPrecision(vertSplitters[counter].Left, horSplitters[count].Left) &&
                            Double.lessWithPrecision(vertSplitters[counter].Left, (horSplitters[count].Left + horSplitters[count].Width))) &&
                        Double.greaterWithPrecision(vertSplitters[counter].Top + vertSplitters[counter].Height, horSplitters[count].Top) &&
                        (count < horSplitters.length - 1)) {
                        var bottomComponentsIds = horSplitters[count].BottomComponentIds;

                        var topComponentIds = horSplitters[count].TopComponentIds;

                        var leftComponentIds = vertSplitters[counter].LeftComponentIds;

                        var rightComponentIds = vertSplitters[counter].RightComponentIds;

                        var intersectionTop = horSplitters[count].Top;

                        var intersectionLeft = vertSplitters[counter].Left;

                        for (var bottomCounter = 0; bottomCounter < layout.components.length; bottomCounter++) {
                            if (bottomComponentsIds != undefined &&
                                bottomComponentsIds.indexOf(layout.components[bottomCounter].ComponentId) != -1 &&
                                Double.equalWithPrecision(layout.components[bottomCounter].Top - defaultOffsetForLayout, intersectionTop) &&
                                Double.equalWithPrecision(layout.components[bottomCounter].Left + layout.components[bottomCounter].Width, intersectionLeft)) {
                                var breakIndex = bottomComponentsIds.indexOf(layout.components[bottomCounter].ComponentId);

                                breakIndex += layout.components[bottomCounter].ComponentId.length;

                                bottomsplitComponentIds = horSplitters[count].BottomComponentIds.substring(breakIndex + 1, horSplitters[count].BottomComponentIds.length);

                                bottomComponentsIds = horSplitters[count].BottomComponentIds.substring(0, breakIndex);

                                breakIndex = leftComponentIds.indexOf(layout.components[bottomCounter].ComponentId);

                                leftsplitComponentIds = leftComponentIds.substring(breakIndex, leftComponentIds.length);

                                leftComponentIds = leftComponentIds.substring(0, breakIndex - 1);
                            } else if (topComponentIds != undefined &&
                                topComponentIds.indexOf(layout.components[bottomCounter].ComponentId) != -1 &&
                                Double.equalWithPrecision(layout.components[bottomCounter].Top + layout.components[bottomCounter].Height, intersectionTop) &&
                                Double.equalWithPrecision(layout.components[bottomCounter].Left - defaultOffsetForLayout, intersectionLeft)) {
                                var breakIndex = topComponentIds.indexOf(layout.components[bottomCounter].ComponentId);

                                topsplitComponentIds = horSplitters[count].TopComponentIds.substring(breakIndex, horSplitters[count].TopComponentIds.length);

                                topComponentIds = horSplitters[count].TopComponentIds.substring(0, breakIndex - 1);

                                breakIndex = rightComponentIds.indexOf(layout.components[bottomCounter].ComponentId) + layout.components[bottomCounter].ComponentId.length;

                                rightsplitComponentIds = rightComponentIds.substring(breakIndex + 1, rightComponentIds.length);

                                rightComponentIds = rightComponentIds.substring(0, breakIndex);
                            }
                        }

                        if (topsplitComponentIds != undefined && bottomsplitComponentIds != undefined) {
                            var horSplitter = new HorSplitter((horSplitters[count].Width - (intersectionLeft - horSplitters[count].Left) - defaultOffsetForLayout), horSplitters[count].Top, intersectionLeft + defaultOffsetForLayout, topsplitComponentIds, bottomsplitComponentIds);

                            horSplitters[count].Width = (intersectionLeft - horSplitters[count].Left);

                            horSplitters[count].BottomComponentIds = bottomComponentsIds;

                            horSplitters[count].TopComponentIds = topComponentIds;

                            horSplitters.splice(count + 1, 0, horSplitter);
                        }
                        if (rightsplitComponentIds != undefined && leftsplitComponentIds != undefined) {
                            var vertSplitter = new VertSplitter((vertSplitters[counter].Height - (intersectionTop - vertSplitters[counter].Top) - defaultOffsetForLayout), horSplitters[count].Top + defaultOffsetForLayout, intersectionLeft, leftsplitComponentIds, rightsplitComponentIds);

                            vertSplitters[counter].Height = (intersectionTop - vertSplitters[counter].Top);

                            vertSplitters[counter].LeftComponentIds = leftComponentIds;

                            vertSplitters[counter].RightComponentIds = rightComponentIds;

                            vertSplitters.splice(counter + 1, 0, vertSplitter);

                            counter += 1;
                        }
                    }
                }
            }
        };

        var populateSplitters = function (layout, defaultOffsetForLayout) {
            if (layout) {
                layout.horSplittersSortedByTopLeft = [];
                layout.vertSplittersSortedByLeftTop = [];

                scanAndSort(layout);

                mergeHorSplitters(layout, defaultOffsetForLayout);

                mergeVertSplitters(layout, defaultOffsetForLayout);

                breakHorAndVertSplittersAtIntersection(layout, defaultOffsetForLayout);
            }
            removeExtraResizeHandles();
        };

        var removeExtraResizeHandles = function () {
            if (resizeHandleTimer != null) {
                clearTimeout(resizeHandleTimer);
                resizeHandleTimer = null;
            }
            resizeHandleTimer = setTimeout(function () {
                var handlesShownComponents = [];
                parentComponentLayoutMap.each(function (id, layout, index) {

                    var idConst = id.split('_');
                    var componentId = idConst[idConst.length - 1];
                    var scope = Util.GetElementScope(componentId).vm;
                    if (scope) {
                        if (handlesShownComponents.indexOf(componentId) == -1) {
                            scope.showAllResizeHandles(componentId);
                            handlesShownComponents.push(componentId);
                        }

                        var firstHorSplitter = layout.horSplittersSortedByTopLeft[0];
                        var lastHorSplitter = layout.horSplittersSortedByTopLeft[layout.horSplittersSortedByTopLeft.length - 1];
                        var firstVertSplitter = layout.vertSplittersSortedByLeftTop[0];
                        var lastVertSplitter = layout.vertSplittersSortedByLeftTop[layout.vertSplittersSortedByLeftTop.length - 1];

                        if (firstHorSplitter && firstHorSplitter.BottomComponentIds) {
                            scope.removeNorthResizeHandle(firstHorSplitter.BottomComponentIds.split(','));
                        }
                        if (lastHorSplitter && lastHorSplitter.TopComponentIds) {
                            scope.removeSouthResizeHandle(lastHorSplitter.TopComponentIds.split(','));
                        }
                        if (lastVertSplitter && lastVertSplitter.LeftComponentIds) {
                            scope.removeEastResizeHandle(lastVertSplitter.LeftComponentIds.split(','));
                        }
                        if (firstVertSplitter && firstVertSplitter.RightComponentIds) {
                            scope.removeWestResizeHandle(firstVertSplitter.RightComponentIds.split(','));
                        }
                    }
                });
            }, 500);
        };

        var arrangeSideBySide = function (parentLayout) {
            var concatenatedId = returnConcatenatedId(CurrentLogicalScreen, parentLayout);
            var layoutCopy = createCopyAndReturnNewReference(parentComponentLayoutMap.get(concatenatedId));
            if (layoutCopy) {
                var parentWidthPercent = 100;
                var topPercent = 0;
                var leftPercent = 0;
                var eachContainerWidthPercent = parentWidthPercent / layoutCopy.components.length;

                for (var compIndex = 0; compIndex < layoutCopy.components.length; compIndex++) {
                    var component = layoutCopy.components[compIndex];
                    component.TopPercent = topPercent;
                    component.LeftPercent = leftPercent;
                    component.HeightPercent = parentWidthPercent;
                    component.WidthPercent = eachContainerWidthPercent;

                    leftPercent += eachContainerWidthPercent;
                }
            }
            var floorScope = Util.GetElementScope($rootScope.floorId).vm;
            var screenInfo = floorScope.prepareAndGetScreenUpdateInfoObj($rootScope.floorId, CurrentLogicalScreen, JSON.stringify(layoutCopy), null, null, false, false);
            return screenInfo;
        };

        var arrangeStacked = function (parentLayout) {
            var concatenatedId = returnConcatenatedId(CurrentLogicalScreen, parentLayout);
            var layoutCopy = createCopyAndReturnNewReference(parentComponentLayoutMap.get(concatenatedId));
            if (layoutCopy) {
                var parentWidthPercent = 100;
                var parentHeightPercent = 100;
                var topPercent = 0;
                var leftPercent = 0;
                var eachContainerHeightPercent = parentHeightPercent / layoutCopy.components.length;

                for (var compIndex = 0; compIndex < layoutCopy.components.length; compIndex++) {
                    var component = layoutCopy.components[compIndex];
                    component.TopPercent = topPercent;
                    component.LeftPercent = leftPercent;
                    component.HeightPercent = eachContainerHeightPercent;
                    component.WidthPercent = parentWidthPercent;

                    topPercent += eachContainerHeightPercent;
                }
            }
            var floorScope = Util.GetElementScope($rootScope.floorId).vm;
            var screenInfo = floorScope.prepareAndGetScreenUpdateInfoObj($rootScope.floorId, CurrentLogicalScreen, JSON.stringify(layoutCopy), null, null, false, false);
            return screenInfo;
        };

        var arrangeEvenly = function (parentlayout) {
            var concatenatedId = returnConcatenatedId(CurrentLogicalScreen, parentlayout);
            var layoutCopy = createCopyAndReturnNewReference(parentComponentLayoutMap.get(concatenatedId));
            if (layoutCopy) {
                var components = layoutCopy.components;
                var noOfContainers = components.length;
                var squareRoot = Math.sqrt(noOfContainers);
                var floor = Math.floor(squareRoot);
                var ceil = Math.ceil(squareRoot);
                var componentCounter = 0;
                var topCounterPercent = 0;
                var leftCounterPercent = 0;
                var parentWidthPercent = 100;
                var parentHeightPercent = 100;

                var eachContainerWidthPercent = parentWidthPercent / ceil;

                if (noOfContainers > (floor * ceil)) {
                    var remainder = noOfContainers - (floor * ceil);
                    var heightForEachContainer1Percent = parentHeightPercent / ceil;
                    var heightForEachContainer2Percent = parentHeightPercent / floor;

                    for (var colNo = 0; colNo < remainder; colNo++) {
                        topCounterPercent = 0;
                        for (var rowNo = 0; rowNo < ceil; rowNo++) {

                            components[componentCounter].WidthPercent = eachContainerWidthPercent;
                            components[componentCounter].HeightPercent = heightForEachContainer1Percent;

                            if (rowNo > 0) {
                                components[componentCounter].TopPercent = topCounterPercent;
                            } else {
                                components[componentCounter].TopPercent = 0;
                            }

                            components[componentCounter].LeftPercent = leftCounterPercent;
                            topCounterPercent += components[componentCounter].HeightPercent;

                            componentCounter++;
                        }
                        leftCounterPercent += eachContainerWidthPercent;
                    }

                    for (var colNo = remainder; colNo < ceil; colNo++) {
                        topCounterPercent = 0;

                        for (var rowNo = 0; rowNo < floor; rowNo++) {
                            components[componentCounter].WidthPercent = eachContainerWidthPercent;
                            components[componentCounter].HeightPercent = heightForEachContainer2Percent;

                            if (rowNo > 0) {
                                components[componentCounter].TopPercent = topCounterPercent;
                            } else {
                                components[componentCounter].TopPercent = 0;
                            }
                            components[componentCounter].LeftPercent = leftCounterPercent;

                            topCounterPercent += components[componentCounter].HeightPercent;

                            componentCounter++;
                        }
                        leftCounterPercent += eachContainerWidthPercent;
                    }
                } else if (noOfContainers < (floor * ceil)) {
                    var remainder = (floor * ceil) - noOfContainers;
                    var noOfRowsinLastColumn = noOfContainers - (floor * floor);
                    var heightForEachContainer1Percent = parentHeightPercent / floor;
                    var heightForEachContainer2Percent = parentHeightPercent / noOfRowsinLastColumn;

                    for (var colNo = 0; colNo < ceil - 1; colNo++) {
                        topCounterPercent = 0;

                        for (var rowNo = 0; rowNo < floor; rowNo++) {
                            components[componentCounter].WidthPercent = eachContainerWidthPercent;
                            components[componentCounter].HeightPercent = heightForEachContainer1Percent;

                            if (rowNo > 0) {
                                components[componentCounter].TopPercent = topCounterPercent;
                            } else {
                                components[componentCounter].TopPercent = 0;
                            }
                            components[componentCounter].LeftPercent = leftCounterPercent;
                            topCounterPercent += components[componentCounter].HeightPercent;
                            componentCounter++;
                        }
                        leftCounterPercent += eachContainerWidthPercent;
                    }

                    topCounterPercent = 0;

                    for (var rowNo = 0; rowNo < noOfRowsinLastColumn; rowNo++) {
                        components[componentCounter].WidthPercent = eachContainerWidthPercent;
                        components[componentCounter].HeightPercent = heightForEachContainer2Percent;

                        if (rowNo > 0) {
                            components[componentCounter].TopPercent = topCounterPercent;
                        } else {
                            components[componentCounter].TopPercent = 0;
                        }
                        components[componentCounter].LeftPercent = leftCounterPercent;

                        topCounterPercent += components[componentCounter].HeightPercent;

                        componentCounter++;
                    }
                } else if (noOfContainers == (floor * ceil)) {
                    var heightForEachContainer1Percent = parentHeightPercent / floor;

                    for (var colNo = 0; colNo < ceil; colNo++) {
                        topCounterPercent = 0;
                        for (var rowNo = 0; rowNo < floor; rowNo++) {
                            components[componentCounter].WidthPercent = eachContainerWidthPercent;
                            components[componentCounter].HeightPercent = heightForEachContainer1Percent;

                            if (rowNo > 0) {
                                components[componentCounter].TopPercent = topCounterPercent;
                            } else {
                                components[componentCounter].TopPercent = 0;
                            }
                            components[componentCounter].LeftPercent = leftCounterPercent;

                            topCounterPercent += components[componentCounter].HeightPercent;

                            componentCounter++;
                        }
                        leftCounterPercent += eachContainerWidthPercent;
                    }
                }
            }
            var floorScope = Util.GetElementScope($rootScope.floorId).vm;
            var screenInfo = floorScope.prepareAndGetScreenUpdateInfoObj($rootScope.floorId, CurrentLogicalScreen, JSON.stringify(layoutCopy), null, null, false, false);
            return screenInfo;
        };

        var moveStart = function (dragInfo, mouseCoords) {
            CurrentLogicalScreenBeforeDragDrop = CurrentLogicalScreen;
            var draggedElement;

            var elementArray = dragInfo.DragElementsList;

            var draggedContainer;

            for (var dragCount = 0; dragCount < elementArray.length; dragCount++) {
                if (elementArray[dragCount].dragFlag) {
                    draggedElement = elementArray[dragCount];
                    draggedContainer = getComponentFromLayout(elementArray[dragCount].ComponentId, dragInfo.sourceComponentId, dragInfo.sourceComponentType);
                    if (null != draggedContainer) {
                        elementArray[dragCount].HeightPercent = draggedContainer.HeightPercent;
                        elementArray[dragCount].WidthPercent = draggedContainer.WidthPercent;
                        elementArray[dragCount].TopPercent = draggedContainer.TopPercent;
                        elementArray[dragCount].LeftPercent = draggedContainer.LeftPercent;
                    }
                    break;
                }
            }
        };

        var getSectionForDragAndDrop = function (curr_container, absolute_coords) {
            var top = curr_container.Top;
            var left = curr_container.Left;
            var width = curr_container.Width;
            var height = curr_container.Height;
            var x = absolute_coords.x;
            var y = absolute_coords.y;

            if (x > left && x < (left + (width / 3))) {
                if (y > top && y < (top + (height / 3)) && ((x - left) > (y - top))) {
                    //Ignore this in calculation of "w" zone
                    return "n";
                } else if (y > (top + (2 * height) / 3) && y < (top + height) && (((y - (top + (2 * height) / 3))) + (x - left) - (height / 3)) > 0) {
                    //Ignore this in calculation of "w" zone
                    return "s";
                } else {
                    return "w";
                }
            }

            if (y > top && y < (top + (height / 3))) {
                if (x > left && (x < (left + (width / 3))) && ((x - left) < (y - top))) {
                    //Ignore this in calculation of "n" zone
                    return "w";
                } else if (x > (left + ((2 * width) / 3)) && x < (left + width) && ((x - (left + ((2 * width) / 3))) + (y - top) - (height / 3)) > 0) {
                    //Ignore this in calculation of "n" zone
                    return "e";
                } else {
                    return "n";
                }
            }


            if (x > (left + ((2 * width) / 3)) && x < (left + width)) {
                if (y < (top + height) && y > (top + 2 * height / 3) && (y - top - (2 * height / 3)) - (x - left - (2 * width / 3)) > 0) {
                    //Ignore this in calculation of "e" zone
                    return "s";
                } else {
                    return "e";
                }
            }

            if (y > (top + ((2 * height) / 3)) && y < (top + height) && x > (left + width / 3) && x < (left + (2 * width / 3))) {
                return "s";
            }
            return "c";
        };

        var getComponentFromLayout = function (componentId, parentComponentId, parentComponentType) {
            var layout = null;
            switch (parentComponentType) {
                case "FLOOR":
                    layout = getLogicalScreenLayoutfromComponent(componentId);
                    break;
            }

            if (layout) {
                var components = layout.components;
                for (var count = 0; count < components.length; count++) {
                    if (components[count].ComponentId == componentId) {
                        return components[count];
                    }
                }
            } else {
                return null;
            }
        };

        var onMoving = function (dragInfo, mouseCoords) {
            var elementArray = dragInfo.DragElementsList;
            var isDestinationChanged = false;
            var draggedContainer;
            var overlayPosition;
            var overlayDiv;
            for (var dragCount = 0; dragCount < elementArray.length; dragCount++) {
                if (elementArray[dragCount].dragFlag) {
                    draggedContainer = elementArray[dragCount];
                    break;
                }
            }

            var parentId = dragInfo.destComponentId;
            var concatenatedId = null;
            if (parentId && Floor.getFloor(parentId)) {
                concatenatedId = CurrentLogicalScreen + "_" + parentId;
            }
            var layout = parentComponentLayoutMap.get(concatenatedId);

            if (layout) {
                var topOffset = 0;
                var leftOffset = 0;

                var absolute_coords = getAbsoluteMouseCoords(parentId, mouseCoords);

                var curr_container = getContainerFromMouseCoords(layout.components, absolute_coords);

                if (draggedContainer && curr_container && curr_container.ComponentId != draggedContainer.ComponentId) {
                    if (getSectionForDragAndDrop(curr_container, absolute_coords)) {
                        overlayDiv = document.getElementById("klera_dragdrop_overlay_div");

                        overlayPosition = getSectionForDragAndDrop(curr_container, absolute_coords);

                        var destComponentOffset = getDefaultOffset(dragInfo.destComponentType).offset;

                        DragDropInfoObject = new dragDropInfoObject(layout, curr_container, overlayPosition, draggedContainer, parentId, dragInfo.destComponentType, destComponentOffset);

                        showOverlayDiv(overlayPosition, overlayDiv, curr_container, topOffset, leftOffset, dragInfo.sourceComponentType, dragInfo, draggedContainer.pinState);
                    }
                } else if (draggedContainer && curr_container && curr_container.ComponentId == draggedContainer.ComponentId) {
                    isDestinationChanged = true;
                    Util.hideOverlayDiv();
                    DragDropInfoObject = null;

                } else {
                    Util.hideOverlayDiv();
                }
            } else {
                Util.hideOverlayDiv();
            }
            return isDestinationChanged;
        };


        var swapContainer = function (DragDropInfoObject, parentLayout, dragInfo) {
            var isDragDropSuccessful = false;
            var sourceScreenInfo = null;
            var targetScreenInfo = null;
            if (DragDropInfoObject) {
                if (!VerifySpaceAllocationToDraggedAndDestinationContainer(DragDropInfoObject.destinationContainer,
                    DragDropInfoObject.draggedContainer,
                    DragDropInfoObject.layout,
                    DragDropInfoObject.draggedContainerMinHeight,
                    DragDropInfoObject.draggedContainerMinWidth,
                    DragDropInfoObject.destinationContainerMinHeight,
                    DragDropInfoObject.destinationContainerMinWidth,
                    DragDropInfoObject.defaultOffset,
                    dragInfo.sourceComponentType)) {
                    isDragDropSuccessful = false;
                } else {
                    var ifComponentPresent = false;
                    var destinationContainer = createCopyAndReturnNewReference(DragDropInfoObject.destinationContainer);
                    var OverlayPosition = DragDropInfoObject.overlayPosition;
                    var draggedContainer = createCopyAndReturnNewReference(DragDropInfoObject.draggedContainer);
                    var layoutCopy = createCopyAndReturnNewReference(DragDropInfoObject.layout);
                    var copyOfDraggedContainer = JSON.stringify(draggedContainer);

                    if (OverlayPosition == "c") {
                        draggedContainer.Top = destinationContainer.Top;
                        draggedContainer.TopPercent = destinationContainer.TopPercent;

                        draggedContainer.Left = destinationContainer.Left;
                        draggedContainer.LeftPercent = destinationContainer.LeftPercent;

                        draggedContainer.Height = destinationContainer.Height;
                        draggedContainer.HeightPercent = destinationContainer.HeightPercent;

                        draggedContainer.Width = destinationContainer.Width;
                        draggedContainer.WidthPercent = destinationContainer.WidthPercent;

                        var tempObj = JSON.parse(copyOfDraggedContainer);

                        destinationContainer.Top = tempObj.Top;
                        destinationContainer.TopPercent = tempObj.TopPercent;

                        destinationContainer.Left = tempObj.Left;
                        destinationContainer.LeftPercent = tempObj.LeftPercent;

                        destinationContainer.Height = tempObj.Height;
                        destinationContainer.HeightPercent = tempObj.HeightPercent;

                        destinationContainer.Width = tempObj.Width;
                        destinationContainer.WidthPercent = tempObj.WidthPercent;

                        for (var count = 0; count < layoutCopy.components.length; count++) {
                            if (layoutCopy.components[count].ComponentId == draggedContainer.ComponentId) {
                                layoutCopy.components[count] = draggedContainer;
                                ifComponentPresent = true;
                            } else if (layoutCopy.components[count].ComponentId == destinationContainer.ComponentId) {
                                layoutCopy.components[count] = destinationContainer;
                            }
                        }
                        var draggedContainerLayoutCopy;
                        if (dragInfo.sourceComponentId == dragInfo.destComponentId) {
                            if (!ifComponentPresent) {
                                var draggedContainerLayout = getLogicalScreenLayoutfromComponent(draggedContainer.ComponentId);
                                draggedContainerLayoutCopy = createCopyAndReturnNewReference(draggedContainerLayout);
                                onComponentDeleteforSwap(draggedContainerLayoutCopy, draggedContainer);
                                onComponentDeleteforSwap(layoutCopy, destinationContainer);
                                draggedContainerLayoutCopy.components.push(destinationContainer);
                                layoutCopy.components.push(draggedContainer);
                            } else {
                                draggedContainerLayoutCopy = layoutCopy;
                            }
                            var srcAndTargetScreenInfo = prepareSourceAndTargetScreenInfo(dragInfo, srcLogicalScreenIndex, targetLogicalScreenIndex, layoutCopy, draggedContainerLayoutCopy, draggedContainer, destinationContainer, true);
                            sourceScreenInfo = srcAndTargetScreenInfo.sourceScreenInfo;
                            targetScreenInfo = srcAndTargetScreenInfo.targetScreenInfo;
                            isDragDropSuccessful = true;
                        } else {
                            // Across Floor Drag Drop Case
                            isDragDropSuccessful = false;
                        }
                    }
                }
            }
            return {
                isDragDropSuccessful: isDragDropSuccessful,
                sourceScreenInfo: sourceScreenInfo,
                targetScreenInfo: targetScreenInfo
            };
        };

        var showOverlayDiv = function (overlayPosition, overlayDiv, curr_container, topOffset, leftOffset, sourceComponentType, dragInfo, pinState) {

            if (!VerifySpaceAllocationToDraggedAndDestinationContainer(DragDropInfoObject.destinationContainer,
                DragDropInfoObject.draggedContainer,
                DragDropInfoObject.layout,
                DragDropInfoObject.draggedContainerMinHeight,
                DragDropInfoObject.draggedContainerMinWidth,
                DragDropInfoObject.destinationContainerMinHeight,
                DragDropInfoObject.destinationContainerMinWidth,
                DragDropInfoObject.defaultOffset,
                sourceComponentType)) {
                overlayDiv.style.backgroundColor = "#F75D59";
            } else {
                overlayDiv.style.backgroundColor = "";
            }
            overlayDiv.style.display = "block";

            if (overlayPosition == "n") {
                overlayDiv.style.top = parseInt(topOffset) + parseInt(curr_container.Top) + "px";
                overlayDiv.style.left = parseInt(leftOffset) + parseInt(curr_container.Left) + "px";
                overlayDiv.style.height = (parseInt(curr_container.Height) / 2) + "px";
                overlayDiv.style.width = curr_container.Width + "px";
            } else if (overlayPosition == "s") {
                overlayDiv.style.top = parseInt(topOffset) + (parseInt(curr_container.Top) + (parseInt(curr_container.Height) / 2)) + "px";
                overlayDiv.style.left = parseInt(leftOffset) + parseInt(curr_container.Left) + "px";
                overlayDiv.style.height = (parseInt(curr_container.Height) / 2) + "px";
                overlayDiv.style.width = curr_container.Width + "px";
            } else if (overlayPosition == "e") {
                overlayDiv.style.top = parseInt(topOffset) + parseInt(curr_container.Top) + "px";
                overlayDiv.style.left = parseInt(leftOffset) + (parseInt(curr_container.Left) + (parseInt(curr_container.Width) / 2)) + "px";
                overlayDiv.style.height = curr_container.Height + "px";
                overlayDiv.style.width = (parseInt(curr_container.Width) / 2) + "px";
            } else if (overlayPosition == "w") {
                overlayDiv.style.top = parseInt(topOffset) + parseInt(curr_container.Top) + "px";
                overlayDiv.style.left = parseInt(leftOffset) + parseInt(curr_container.Left) + "px";
                overlayDiv.style.height = curr_container.Height + "px";
                overlayDiv.style.width = (parseInt(curr_container.Width) / 2) + "px";
            } else if (overlayPosition == "c") {
                overlayDiv.style.top = parseInt(topOffset) + parseInt(curr_container.Top) + "px";
                overlayDiv.style.left = parseInt(leftOffset) + parseInt(curr_container.Left) + "px";
                overlayDiv.style.height = curr_container.Height + "px";
                overlayDiv.style.width = curr_container.Width + "px";
            }
        };

        var getContainerDetailFromLayout = function (componentId, layoutCopy) {
            var destinationComponent = null;
            for (var count = 0; count < layoutCopy.components.length; count++) {
                if (layoutCopy.components[count].ComponentId == componentId) {
                    destinationComponent = layoutCopy.components[count];
                    break;
                }
            }
            return destinationComponent;
        };

        var isLayoutComponentEmpty = function (layout) {
            return layout === null || layout.components.length == 0;
        }

        var prepareSourceAndTargetScreenInfo = function (dragInfo, srcLogicalScreenIndex, targetLogicalScreenIndex, layoutCopy,
            draggedContainerLayout, draggedContainer, destinationContainer, isSwap, cardHoverState, isTargetAdd) {
            var sourceScreenInfo = null,
                targetScreenInfo = null,
                draggedLayoutComponent = null,
                targetLayoutComponent = null;

            var floorScope = Util.GetElementScope($rootScope.floorId).vm;
            var isSourceDeleted = isLayoutComponentEmpty(draggedContainerLayout) && srcLogicalScreenIndex > -1;
            isTargetAdd = isTargetAdd || false;
            if (isSwap === undefined) {
                isSwap = false;
            }
            if (draggedContainer) {
                if (cardHoverState == true) {
                    draggedContainer.pinState = Util.CI.PinState.LeftCard;
                } else {
                    draggedContainer.pinState = Util.CI.PinState.Normal;
                }
                draggedLayoutComponent = new PageManager.LayoutComponentInfo(draggedContainer.ComponentId, draggedContainer.ComponentType, draggedContainer.pinState);
            }
            if (destinationContainer) {
                targetLayoutComponent = new PageManager.LayoutComponentInfo(destinationContainer.ComponentId, destinationContainer.ComponentType, destinationContainer.pinState);
            }
            var srcComponentToAdd = null;
            var targetComponentToRemove = null;
            if (isSwap) {
                srcComponentToAdd = targetLayoutComponent;
                targetComponentToRemove = draggedLayoutComponent;
            }
            //null check instead of if(srcLogicalScreenIndex) to allow processing when srcLogicalScreenIndex = 0 
            if (srcLogicalScreenIndex != null) {
                sourceScreenInfo = floorScope.prepareAndGetScreenUpdateInfoObj(dragInfo.sourceComponentId, srcLogicalScreenIndex, JSON.stringify(draggedContainerLayout), srcComponentToAdd, draggedLayoutComponent, isSourceDeleted, false);
            }
            if (targetLogicalScreenIndex != null) {
                targetScreenInfo = floorScope.prepareAndGetScreenUpdateInfoObj(dragInfo.destComponentId, targetLogicalScreenIndex, JSON.stringify(layoutCopy), draggedLayoutComponent, targetComponentToRemove, false, isTargetAdd);
            }
            return {
                sourceScreenInfo: sourceScreenInfo,
                targetScreenInfo: targetScreenInfo
            }
        };

        var moveComponentsForNorthDragDrop = function (DragDropInfoObject, parentLayout, dragInfo) {
            var isDragDropSuccessful = false;
            var sourceScreenInfo = null;
            var targetScreenInfo = null;
            var parentLayout = createCopyAndReturnNewReference(parentLayout);
            var srcAndTargetScreenInfo = {
                'sourceScreenInfo': null,
                'targetScreenInfo': null
            }
            if (DragDropInfoObject) {
                if (!VerifySpaceAllocationToDraggedAndDestinationContainer(DragDropInfoObject.destinationContainer,
                    DragDropInfoObject.draggedContainer,
                    DragDropInfoObject.layout,
                    DragDropInfoObject.draggedContainerMinHeight,
                    DragDropInfoObject.draggedContainerMinWidth,
                    DragDropInfoObject.destinationContainerMinHeight,
                    DragDropInfoObject.destinationContainerMinWidth,
                    DragDropInfoObject.defaultOffset,
                    dragInfo.sourceComponentType)) {
                    isDragDropSuccessful = false;
                } else {
                    var ifComponentPresent = false;
                    var destinationContainer = createCopyAndReturnNewReference(DragDropInfoObject.destinationContainer);
                    var draggedContainer = createCopyAndReturnNewReference(DragDropInfoObject.draggedContainer);
                    var layoutCopy = createCopyAndReturnNewReference(DragDropInfoObject.layout);

                    allotSpaceToOtherContainers(draggedContainer, layoutCopy, DragDropInfoObject.defaultOffset);

                    //allot space API made some changes in destination container reference so we have to fetch it from layout                           
                    destinationContainer = getContainerDetailFromLayout(destinationContainer.ComponentId, layoutCopy);

                    draggedContainer.TopPercent = destinationContainer.TopPercent;
                    draggedContainer.Top = destinationContainer.Top;

                    draggedContainer.LeftPercent = destinationContainer.LeftPercent;
                    draggedContainer.Left = destinationContainer.Left;

                    draggedContainer.WidthPercent = destinationContainer.WidthPercent;
                    draggedContainer.Width = destinationContainer.Width;

                    draggedContainer.HeightPercent = destinationContainer.HeightPercent / 2;
                    draggedContainer.Height = ((destinationContainer.Height - DragDropInfoObject.defaultOffset) / 2);

                    destinationContainer.TopPercent = draggedContainer.TopPercent + draggedContainer.HeightPercent;
                    destinationContainer.Top = draggedContainer.Top + draggedContainer.Height + DragDropInfoObject.defaultOffset;

                    destinationContainer.HeightPercent = destinationContainer.HeightPercent / 2;
                    destinationContainer.Height = ((destinationContainer.Height - DragDropInfoObject.defaultOffset) / 2);

                    for (var count = 0; count < layoutCopy.components.length; count++) {
                        if (layoutCopy.components[count].ComponentId == draggedContainer.ComponentId) {
                            layoutCopy.components[count] = draggedContainer;
                            ifComponentPresent = true;
                        } else if (layoutCopy.components[count].ComponentId == destinationContainer.ComponentId) {
                            layoutCopy.components[count] = destinationContainer;
                        }
                    }
                    var draggedContainerLayoutCopy;
                    if (dragInfo.sourceComponentId == dragInfo.destComponentId) {
                        if (!ifComponentPresent) {
                            var draggedContainerLayout = getLogicalScreenLayoutfromComponent(draggedContainer.ComponentId);
                            draggedContainerLayoutCopy = createCopyAndReturnNewReference(draggedContainerLayout);
                            draggedContainerLayoutCopy = onComponentDeleteNew(draggedContainerLayoutCopy, draggedContainer, parentLayout);
                            layoutCopy.components.push(draggedContainer);
                        } else {
                            draggedContainerLayoutCopy = layoutCopy;
                        }

                        srcAndTargetScreenInfo = prepareSourceAndTargetScreenInfo(dragInfo, srcLogicalScreenIndex, targetLogicalScreenIndex, layoutCopy, draggedContainerLayoutCopy, draggedContainer, destinationContainer, false, false);
                        isDragDropSuccessful = true;
                    } else {
                        // Across Floor Drag Drop Case
                        isDragDropSuccessful = true;
                        layoutCopy.components.push(draggedContainer);
                        srcAndTargetScreenInfo = prepareSourceAndTargetScreenInfo(dragInfo, null, targetLogicalScreenIndex, layoutCopy, null, draggedContainer, null);
                    }
                }
            }
            return {
                isDragDropSuccessful: isDragDropSuccessful,
                sourceScreenInfo: srcAndTargetScreenInfo.sourceScreenInfo,
                targetScreenInfo: srcAndTargetScreenInfo.targetScreenInfo
            };
        };

        var moveComponentsForSouthDragDrop = function (DragDropInfoObject, parentLayout, dragInfo) {
            var isDragDropSuccessful = false;
            var sourceScreenInfo = null;
            var targetScreenInfo = null;
            var parentLayout = createCopyAndReturnNewReference(parentLayout);
            var srcAndTargetScreenInfo = {
                'sourceScreenInfo': null,
                'targetScreenInfo': null
            }
            if (DragDropInfoObject) {
                if (!VerifySpaceAllocationToDraggedAndDestinationContainer(DragDropInfoObject.destinationContainer,
                    DragDropInfoObject.draggedContainer,
                    DragDropInfoObject.layout,
                    DragDropInfoObject.draggedContainerMinHeight,
                    DragDropInfoObject.draggedContainerMinWidth,
                    DragDropInfoObject.destinationContainerMinHeight,
                    DragDropInfoObject.destinationContainerMinWidth,
                    DragDropInfoObject.defaultOffset,
                    dragInfo.sourceComponentType)) {
                    isDragDropSuccessful = false;
                } else {
                    var ifComponentPresent = false;
                    var destinationContainer = createCopyAndReturnNewReference(DragDropInfoObject.destinationContainer);
                    var draggedContainer = createCopyAndReturnNewReference(DragDropInfoObject.draggedContainer);
                    var layoutCopy = createCopyAndReturnNewReference(DragDropInfoObject.layout);

                    allotSpaceToOtherContainers(draggedContainer, layoutCopy, DragDropInfoObject.defaultOffset);

                    //allot space API made some changes in destination container reference so we have to fetch it from layout                           
                    destinationContainer = getContainerDetailFromLayout(destinationContainer.ComponentId, layoutCopy);

                    draggedContainer.WidthPercent = destinationContainer.WidthPercent;
                    draggedContainer.Width = destinationContainer.Width;

                    draggedContainer.HeightPercent = destinationContainer.HeightPercent / 2;
                    draggedContainer.Height = ((destinationContainer.Height - DragDropInfoObject.defaultOffset) / 2);

                    destinationContainer.HeightPercent = destinationContainer.HeightPercent / 2;
                    destinationContainer.Height = ((destinationContainer.Height - DragDropInfoObject.defaultOffset) / 2);

                    draggedContainer.TopPercent = destinationContainer.TopPercent + destinationContainer.HeightPercent;
                    draggedContainer.Top = destinationContainer.Top + destinationContainer.Height + DragDropInfoObject.defaultOffset;

                    draggedContainer.LeftPercent = destinationContainer.LeftPercent;
                    draggedContainer.Left = destinationContainer.Left;

                    for (var count = 0; count < layoutCopy.components.length; count++) {
                        if (layoutCopy.components[count].ComponentId == draggedContainer.ComponentId) {
                            layoutCopy.components[count] = draggedContainer;
                            ifComponentPresent = true;
                        } else if (layoutCopy.components[count].ComponentId == destinationContainer.ComponentId) {
                            layoutCopy.components[count] = destinationContainer;
                        }
                    }
                    var draggedContainerLayoutCopy;
                    if (dragInfo.sourceComponentId == dragInfo.destComponentId) {
                        if (!ifComponentPresent) {
                            var draggedContainerLayout = getLogicalScreenLayoutfromComponent(draggedContainer.ComponentId);
                            draggedContainerLayoutCopy = createCopyAndReturnNewReference(draggedContainerLayout);
                            draggedContainerLayoutCopy = onComponentDeleteNew(draggedContainerLayoutCopy, draggedContainer, parentLayout);
                            layoutCopy.components.push(draggedContainer);
                        } else {
                            draggedContainerLayoutCopy = layoutCopy;
                        }
                        srcAndTargetScreenInfo = prepareSourceAndTargetScreenInfo(dragInfo, srcLogicalScreenIndex, targetLogicalScreenIndex, layoutCopy, draggedContainerLayoutCopy, draggedContainer, destinationContainer);
                        isDragDropSuccessful = true;
                    } else {
                        // Across Floor Drag Drop Case
                        isDragDropSuccessful = true;
                        layoutCopy.components.push(draggedContainer);
                        srcAndTargetScreenInfo = prepareSourceAndTargetScreenInfo(dragInfo, null, targetLogicalScreenIndex, layoutCopy, null, draggedContainer, null);
                    }
                }
            }
            return {
                isDragDropSuccessful: isDragDropSuccessful,
                sourceScreenInfo: srcAndTargetScreenInfo.sourceScreenInfo,
                targetScreenInfo: srcAndTargetScreenInfo.targetScreenInfo
            };
        };

        var moveComponentsForEastDragDrop = function (DragDropInfoObject, parentLayout, dragInfo) {
            var isDragDropSuccessful = false;
            var sourceScreenInfo = null;
            var targetScreenInfo = null;
            var parentLayout = createCopyAndReturnNewReference(parentLayout);
            var srcAndTargetScreenInfo = {
                'sourceScreenInfo': null,
                'targetScreenInfo': null
            }
            if (DragDropInfoObject) {
                if (!VerifySpaceAllocationToDraggedAndDestinationContainer(DragDropInfoObject.destinationContainer,
                    DragDropInfoObject.draggedContainer,
                    DragDropInfoObject.layout,
                    DragDropInfoObject.draggedContainerMinHeight,
                    DragDropInfoObject.draggedContainerMinWidth,
                    DragDropInfoObject.destinationContainerMinHeight,
                    DragDropInfoObject.destinationContainerMinWidth,
                    DragDropInfoObject.defaultOffset,
                    dragInfo.sourceComponentType)) {
                    isDragDropSuccessful = false;
                } else {
                    var ifComponentPresent = false;
                    var destinationContainer = createCopyAndReturnNewReference(DragDropInfoObject.destinationContainer);
                    var draggedContainer = createCopyAndReturnNewReference(DragDropInfoObject.draggedContainer);
                    var layoutCopy = createCopyAndReturnNewReference(DragDropInfoObject.layout);

                    allotSpaceToOtherContainers(draggedContainer, layoutCopy, DragDropInfoObject.defaultOffset);

                    //allot space API made some changes in destination container reference so we have to fetch it from layout                           
                    destinationContainer = getContainerDetailFromLayout(destinationContainer.ComponentId, layoutCopy);

                    draggedContainer.TopPercent = destinationContainer.TopPercent;
                    draggedContainer.Top = destinationContainer.Top;

                    draggedContainer.WidthPercent = destinationContainer.WidthPercent / 2;
                    draggedContainer.Width = ((destinationContainer.Width - DragDropInfoObject.defaultOffset) / 2);

                    destinationContainer.WidthPercent = destinationContainer.WidthPercent / 2;
                    destinationContainer.Width = ((destinationContainer.Width - DragDropInfoObject.defaultOffset) / 2);

                    draggedContainer.LeftPercent = destinationContainer.LeftPercent + destinationContainer.WidthPercent;
                    draggedContainer.Left = destinationContainer.Left + destinationContainer.Width + DragDropInfoObject.defaultOffset;

                    draggedContainer.HeightPercent = destinationContainer.HeightPercent;
                    draggedContainer.Height = destinationContainer.Height;

                    for (var count = 0; count < layoutCopy.components.length; count++) {
                        if (layoutCopy.components[count].ComponentId == draggedContainer.ComponentId) {
                            layoutCopy.components[count] = draggedContainer;
                            ifComponentPresent = true;
                        } else if (layoutCopy.components[count].ComponentId == destinationContainer.ComponentId) {
                            layoutCopy.components[count] = destinationContainer;
                        }
                    }
                    var draggedContainerLayoutCopy;
                    if (dragInfo.sourceComponentId == dragInfo.destComponentId) {
                        if (!ifComponentPresent) {
                            var draggedContainerLayout = getLogicalScreenLayoutfromComponent(draggedContainer.ComponentId);
                            draggedContainerLayoutCopy = JSON.parse(JSON.stringify(draggedContainerLayout));
                            draggedContainerLayoutCopy = onComponentDeleteNew(draggedContainerLayoutCopy, draggedContainer, parentLayout);
                            layoutCopy.components.push(draggedContainer);
                        } else {
                            draggedContainerLayoutCopy = layoutCopy;
                        }
                        var srcAndTargetScreenInfo = prepareSourceAndTargetScreenInfo(dragInfo, srcLogicalScreenIndex, targetLogicalScreenIndex, layoutCopy, draggedContainerLayoutCopy, draggedContainer, destinationContainer);
                        isDragDropSuccessful = true;
                    } else {
                        // Across Floor Drag Drop Case
                        isDragDropSuccessful = true;
                        layoutCopy.components.push(draggedContainer);
                        srcAndTargetScreenInfo = prepareSourceAndTargetScreenInfo(dragInfo, null, targetLogicalScreenIndex, layoutCopy, null, draggedContainer, null);
                    }
                }
            }
            return {
                isDragDropSuccessful: isDragDropSuccessful,
                sourceScreenInfo: srcAndTargetScreenInfo.sourceScreenInfo,
                targetScreenInfo: srcAndTargetScreenInfo.targetScreenInfo
            };
        };

        var moveComponentsForWestDragDrop = function (DragDropInfoObject, parentLayout, dragInfo) {
            var isDragDropSuccessful = false;
            var sourceScreenInfo = null;
            var targetScreenInfo = null;
            var parentLayout = createCopyAndReturnNewReference(parentLayout);
            var srcAndTargetScreenInfo = {
                'sourceScreenInfo': null,
                'targetScreenInfo': null
            }
            if (DragDropInfoObject) {
                if (!VerifySpaceAllocationToDraggedAndDestinationContainer(DragDropInfoObject.destinationContainer,
                    DragDropInfoObject.draggedContainer,
                    DragDropInfoObject.layout,
                    DragDropInfoObject.draggedContainerMinHeight,
                    DragDropInfoObject.draggedContainerMinWidth,
                    DragDropInfoObject.destinationContainerMinHeight,
                    DragDropInfoObject.destinationContainerMinWidth,
                    DragDropInfoObject.defaultOffset,
                    dragInfo.sourceComponentType)) {
                    isDragDropSuccessful = false;
                } else {
                    var ifComponentPresent = false;
                    var destinationContainer = createCopyAndReturnNewReference(DragDropInfoObject.destinationContainer);
                    var OverlayPosition = DragDropInfoObject.overlayPosition;
                    var draggedContainer = createCopyAndReturnNewReference(DragDropInfoObject.draggedContainer);
                    var layoutCopy = createCopyAndReturnNewReference(DragDropInfoObject.layout);

                    allotSpaceToOtherContainers(draggedContainer, layoutCopy, DragDropInfoObject.defaultOffset);

                    //allot space API made some changes in destination container reference so we have to fetch it from layout                           
                    destinationContainer = getContainerDetailFromLayout(destinationContainer.ComponentId, layoutCopy);

                    draggedContainer.TopPercent = destinationContainer.TopPercent;
                    draggedContainer.Top = destinationContainer.Top;

                    draggedContainer.LeftPercent = destinationContainer.LeftPercent;
                    draggedContainer.Left = destinationContainer.Left;

                    draggedContainer.WidthPercent = destinationContainer.WidthPercent / 2;
                    draggedContainer.Width = ((destinationContainer.Width - DragDropInfoObject.defaultOffset) / 2);

                    draggedContainer.HeightPercent = destinationContainer.HeightPercent;
                    draggedContainer.Height = destinationContainer.Height;

                    destinationContainer.WidthPercent = destinationContainer.WidthPercent / 2;
                    destinationContainer.Width = ((destinationContainer.Width - DragDropInfoObject.defaultOffset) / 2);

                    destinationContainer.LeftPercent = destinationContainer.LeftPercent + destinationContainer.WidthPercent;
                    destinationContainer.Left = destinationContainer.Left + destinationContainer.Width + DragDropInfoObject.defaultOffset;

                    for (var count = 0; count < layoutCopy.components.length; count++) {
                        if (layoutCopy.components[count].ComponentId == draggedContainer.ComponentId) {
                            layoutCopy.components[count] = draggedContainer;
                            ifComponentPresent = true;
                        } else if (layoutCopy.components[count].ComponentId == destinationContainer.ComponentId) {
                            layoutCopy.components[count] = destinationContainer;
                        }
                    }
                    var draggedContainerLayoutCopy;
                    if (dragInfo.sourceComponentId == dragInfo.destComponentId) {
                        if (!ifComponentPresent) {
                            var draggedContainerLayout = getLogicalScreenLayoutfromComponent(draggedContainer.ComponentId);
                            draggedContainerLayoutCopy = createCopyAndReturnNewReference(draggedContainerLayout);
                            draggedContainerLayoutCopy = onComponentDeleteNew(draggedContainerLayoutCopy, draggedContainer, parentLayout);
                            layoutCopy.components.push(draggedContainer);
                        } else {
                            draggedContainerLayoutCopy = layoutCopy;
                        }
                        var srcAndTargetScreenInfo = prepareSourceAndTargetScreenInfo(dragInfo, srcLogicalScreenIndex, targetLogicalScreenIndex, layoutCopy, draggedContainerLayoutCopy, draggedContainer, destinationContainer);
                        isDragDropSuccessful = true;
                    } else {
                        // Across Floor Drag Drop Case
                        isDragDropSuccessful = true;
                        layoutCopy.components.push(draggedContainer);
                        srcAndTargetScreenInfo = prepareSourceAndTargetScreenInfo(dragInfo, null, targetLogicalScreenIndex, layoutCopy, null, draggedContainer, null);
                    }
                }
            }
            return {
                isDragDropSuccessful: isDragDropSuccessful,
                sourceScreenInfo: srcAndTargetScreenInfo.sourceScreenInfo,
                targetScreenInfo: srcAndTargetScreenInfo.targetScreenInfo
            };
        };

        var onDrop = function (dragInfo, mouseCoords, cardHoverState) {
            var layoutResult = {};
            var overlayDiv = document.getElementById("klera_dragdrop_overlay_div");

            overlayDiv.style.display = "none";
            var isDragDropSuccessful = false;
            var destId = null;

            var parentComponent = null;
            if (dragInfo && Floor.getFloor(dragInfo.destComponentId)) {
                parentComponent = Floor.getFloor(dragInfo.destComponentId);
            }
            if (!parentComponent) {
                return [isDragDropSuccessful, destId];
            }

            var sourceComponentLogicalScreen = -1;
            var destComponentLogicalScreen = -1;
            if (DragDropInfoObject) {
                sourceComponentLogicalScreen = getLogicalScreenNumberfromComponent(DragDropInfoObject.draggedContainer.ComponentId);
                destComponentLogicalScreen = getLogicalScreenNumberfromComponent(DragDropInfoObject.destinationContainer.ComponentId);
                srcLogicalScreenIndex = sourceComponentLogicalScreen;
                targetLogicalScreenIndex = destComponentLogicalScreen;
            }

            var parentLayout = new CI.LayoutComponent();
            parentLayout.ComponentId = dragInfo.destComponentId;
            parentLayout.ComponentType = dragInfo.destComponentType;
            parentLayout.Top = parentComponent.top;
            parentLayout.Left = parentComponent.left;
            parentLayout.Width = parentComponent.width;
            parentLayout.Height = parentComponent.height;

            CurrentLogicalScreenAfterDragDrop = CurrentLogicalScreen;
            if (isValidDrop(dragInfo, mouseCoords)) {
                if (DragDropInfoObject) {
                    if (DragDropInfoObject.overlayPosition == "c") {
                        updateDraggedContainerToLayoutObj(DragDropInfoObject);
                        layoutResult = swapContainer(DragDropInfoObject, parentLayout, dragInfo);
                    } else if (DragDropInfoObject.overlayPosition == "n") {
                        updateDraggedContainerToLayoutObj(DragDropInfoObject);
                        layoutResult = moveComponentsForNorthDragDrop(DragDropInfoObject, parentLayout, dragInfo);
                    } else if (DragDropInfoObject.overlayPosition == "s") {
                        updateDraggedContainerToLayoutObj(DragDropInfoObject);
                        layoutResult = moveComponentsForSouthDragDrop(DragDropInfoObject, parentLayout, dragInfo);
                    } else if (DragDropInfoObject.overlayPosition == "e") {
                        updateDraggedContainerToLayoutObj(DragDropInfoObject);
                        layoutResult = moveComponentsForEastDragDrop(DragDropInfoObject, parentLayout, dragInfo);
                    } else if (DragDropInfoObject.overlayPosition == "w") {
                        updateDraggedContainerToLayoutObj(DragDropInfoObject);
                        layoutResult = moveComponentsForWestDragDrop(DragDropInfoObject, parentLayout, dragInfo);
                    } else {
                        //If the container is not dropped on another container. Then the container is dropped somewhere on the product window.
                        isDragDropSuccessful = false;
                    }
                }
            } else {
                //If the container is not dropped on another container. Then the container is dropped somewhere on the product window.
                //In this case check for Empty floor and add this container as the new container on destination floor.
                if (dragInfo.destComponentId) {
                    var draggedContainer;
                    var elementArray = dragInfo.DragElementsList;
                    for (var dragCount = 0; dragCount < elementArray.length; dragCount++) {
                        if (elementArray[dragCount].dragFlag) {
                            draggedContainer = elementArray[dragCount];
                            break;
                        }
                    }
                    draggedContainer = createCopyAndReturnNewReference(draggedContainer);
                    srcLogicalScreenIndex = getLogicalScreenNumberfromComponent(draggedContainer.ComponentId);

                    if (cardHoverState) {
                        targetLogicalScreenIndex = -1;
                        // Dropped On Card
                        if (dragInfo.sourceComponentId == dragInfo.destComponentId) {
                            var draggedContainerLayout = getLogicalScreenLayoutfromComponent(draggedContainer.ComponentId);
                            if (draggedContainerLayout) {
                                var draggedContainerLayoutCopy = createCopyAndReturnNewReference(draggedContainerLayout);
                                draggedContainerLayoutCopy = onComponentDeleteNew(draggedContainerLayoutCopy, draggedContainer, parentLayout);
                                var srcAndTargetScreenInfo = prepareSourceAndTargetScreenInfo(dragInfo, srcLogicalScreenIndex, targetLogicalScreenIndex, null,
                                    draggedContainerLayoutCopy, draggedContainer, null, false, cardHoverState, false);
                                layoutResult = {
                                    isDragDropSuccessful: true,
                                    sourceScreenInfo: srcAndTargetScreenInfo.sourceScreenInfo,
                                    targetScreenInfo: srcAndTargetScreenInfo.targetScreenInfo
                                };
                            } else {
                                layoutResult = {
                                    isDragDropSuccessful: false,
                                    sourceScreenInfo: null,
                                    targetScreenInfo: null
                                };
                            }
                        } else {
                            // Across Floor Drop
                            var srcAndTargetScreenInfo = prepareSourceAndTargetScreenInfo(dragInfo, null, targetLogicalScreenIndex, null, null, draggedContainer, null, false, false, false);
                            layoutResult = {
                                isDragDropSuccessful: true,
                                sourceScreenInfo: srcAndTargetScreenInfo.sourceScreenInfo,
                                targetScreenInfo: srcAndTargetScreenInfo.targetScreenInfo
                            };
                        }
                    } else {
                        // Dropped On Floor
                        targetLogicalScreenIndex = CurrentLogicalScreen;
                        const currComponentsList = getComponentMap(targetLogicalScreenIndex);
                        if (currComponentsList.length === 0) {
                            if (dragInfo.sourceComponentId == dragInfo.destComponentId) {
                                var layoutCopy = createLayoutObject(draggedContainer.ComponentId, draggedContainer.ComponentType);
                                var draggedContainerLayout = getLogicalScreenLayoutfromComponent(draggedContainer.ComponentId);
                                var draggedContainerLayoutCopy = createCopyAndReturnNewReference(draggedContainerLayout);
                                draggedContainerLayoutCopy = onComponentDeleteNew(draggedContainerLayoutCopy, draggedContainer, parentLayout);
                                var srcAndTargetScreenInfo = prepareSourceAndTargetScreenInfo(dragInfo, srcLogicalScreenIndex, targetLogicalScreenIndex, layoutCopy,
                                    draggedContainerLayoutCopy, draggedContainer, null, false, cardHoverState, true);
                                layoutResult = {
                                    isDragDropSuccessful: true,
                                    sourceScreenInfo: srcAndTargetScreenInfo.sourceScreenInfo,
                                    targetScreenInfo: srcAndTargetScreenInfo.targetScreenInfo
                                };
                            } else {
                                // Across Floor Drop
                                var layoutCopy = createLayoutObject(draggedContainer.ComponentId, draggedContainer.ComponentType);
                                var srcAndTargetScreenInfo = prepareSourceAndTargetScreenInfo(dragInfo, null, targetLogicalScreenIndex, layoutCopy, null, draggedContainer, null, false, false, true);
                                layoutResult = {
                                    isDragDropSuccessful: true,
                                    sourceScreenInfo: srcAndTargetScreenInfo.sourceScreenInfo,
                                    targetScreenInfo: srcAndTargetScreenInfo.targetScreenInfo
                                };
                            }
                        } else {
                            isDragDropSuccessful = false;
                        }
                    }
                } else {
                    isDragDropSuccessful = false;
                }
            }

            var destContainerId = (DragDropInfoObject && DragDropInfoObject.destinationContainer && DragDropInfoObject.destinationContainer.ComponentId) ? DragDropInfoObject.destinationContainer.ComponentId : null;
            if (layoutResult.isDragDropSuccessful !== undefined) {
                isDragDropSuccessful = layoutResult.isDragDropSuccessful;
            }
            return [isDragDropSuccessful, destId, destContainerId, layoutResult];
        };

        var updateDraggedContainerToLayoutObj = function (dragDropInfoObj) {
            var draggedContainer = dragDropInfoObj.draggedContainer;
            var newObj = new CI.LayoutComponent(draggedContainer.ComponentId, draggedContainer.ComponentType, draggedContainer.Top, draggedContainer.Left, draggedContainer.Width, draggedContainer.Height, draggedContainer.ViewDefId);
            newObj.HeightPercent = draggedContainer.HeightPercent;
            newObj.TopPercent = draggedContainer.TopPercent;
            newObj.WidthPercent = draggedContainer.WidthPercent;
            newObj.LeftPercent = draggedContainer.LeftPercent;
            dragDropInfoObj.draggedContainer = newObj;
        };

        var getDraggedContainerFromDragElementList = function (elementArray) {
            var draggedContainer = null;
            if (elementArray && elementArray.length) {
                for (var dragCount = 0; dragCount < elementArray.length; dragCount++) {
                    if (elementArray[dragCount].dragFlag) {
                        draggedContainer = elementArray[dragCount];
                        break;
                    }
                }
            }
            return draggedContainer;
        };

        var moveEnd = function (dragInfo, mouseCoords, isAcrossFloor, parentComponentType) {
            var sourceScreenInfo = null;
            var floorScope = Util.GetElementScope($rootScope.floorId).vm;
            if (isAcrossFloor) {
                var elementArray = dragInfo.DragElementsList;
                var draggedContainer = getDraggedContainerFromDragElementList(elementArray);
                if (parentComponentType === undefined) {
                    parentComponentType = Util.CI.ComponentType.Floor;
                }
                var defaultOffset = getDefaultOffset(parentComponentType).offset;
                var draggedContainer = createCopyAndReturnNewReference(draggedContainer);
                var draggedLayoutComponent = new PageManager.LayoutComponentInfo(draggedContainer.ComponentId, draggedContainer.ComponentType, draggedContainer.pinState);
                var srcLogicalScreenIndex = getLogicalScreenNumberfromComponent(draggedContainer.ComponentId);
                var draggedContainerLayout = createCopyAndReturnNewReference(getLogicalScreenLayoutfromComponent(draggedContainer.ComponentId));
                if (draggedContainerLayout != null && draggedContainerLayout.components.length > 0) {
                    allotSpaceToOtherContainers(draggedContainer, draggedContainerLayout, defaultOffset);
                }
                var isDeleted = draggedContainerLayout.components.length > 0 ? false : true;
                sourceScreenInfo = floorScope.prepareAndGetScreenUpdateInfoObj(dragInfo.sourceComponentId, srcLogicalScreenIndex, JSON.stringify(draggedContainerLayout), null, draggedLayoutComponent, isDeleted, false);
            }
            var overlayDiv = document.getElementById("klera_dragdrop_overlay_div");
            overlayDiv.style.display = "none";
            $.event.trigger({
                type: "Layout",
                message: "Layout Complete",
                time: new Date()
            });
            return sourceScreenInfo;
        };

        var moveEnter = function (dragInfo, mouseCoords) {
            var overlayDiv = document.getElementById("klera_dragdrop_overlay_div");
            overlayDiv.style.display = "none";
            logService.LogMessage("[layout-manager] dragEnter", logService.LogLevel.Info);
        };

        var moveLeave = function (dragInfo, mouseCoords) {
            var overlayDiv = document.getElementById("klera_dragdrop_overlay_div");
            overlayDiv.style.display = "none";
            logService.LogMessage("[layout-manager] dragLeave", logService.LogLevel.Info);
        };

        var paint = function (parentLayout) {
            var offsetToUse = getDefaultOffset(parentLayout.ComponentType).offset;
            switch (parentLayout.ComponentType) {
                case Util.CI.ComponentType.Floor:
                    var objFloor = Floor.getFloor(parentLayout.ComponentId);
                    if (objFloor) {
                        var iCurrentLogicalScreen = 0;
                        while (true) {
                            var concatenatedId = iCurrentLogicalScreen + "_" + objFloor.componentId;
                            var logicalScreenLayout = parentComponentLayoutMap.get(concatenatedId);

                            if (logicalScreenLayout) {
                                for (var iCurrComponentIndex = 0; iCurrComponentIndex < logicalScreenLayout.components.length; iCurrComponentIndex++) {
                                    UpdateComponentModel(logicalScreenLayout.components[iCurrComponentIndex], objFloor.componentId, Util.CI.ComponentType.Floor);
                                }
                                populateSplitters(logicalScreenLayout, offsetToUse);
                                iCurrentLogicalScreen++;
                            } else {
                                break;
                            }
                        }
                    }
                    break;
            }
        };

        var returnConcatenatedId = function (CurrentLogicalScreen, parentComponent) {
            if (parentComponent && parentComponent.ComponentType == "FLOOR") {
                return CurrentLogicalScreen + "_" + parentComponent.ComponentId;
            } else {
                return null;
            }
        };
        var getSplittersForComponent = function (layout, componentId) {
            var componentSplitter = {};
            var horSplitterDSList = layout.horSplittersSortedByTopLeft;
            var vertSplitterDSList = layout.vertSplittersSortedByLeftTop;
            if (horSplitterDSList && horSplitterDSList.length > 0) {
                var matchCount = 0;
                for (var index = 0; index < horSplitterDSList.length; index++) {
                    if (horSplitterDSList[index].TopComponentIds.indexOf(componentId) != -1) {
                        componentSplitter.bottomSplitter = horSplitterDSList[index];
                        matchCount++;
                    }
                    if (horSplitterDSList[index].BottomComponentIds.indexOf(componentId) != -1) {
                        componentSplitter.topSplitter = horSplitterDSList[index];
                        matchCount++;
                    }
                    if (matchCount == 2) {
                        break;
                    }
                }
            }

            if (vertSplitterDSList && vertSplitterDSList.length > 0) {
                var matchCount = 0;
                for (var index = 0; index < vertSplitterDSList.length; index++) {
                    if (vertSplitterDSList[index].LeftComponentIds.indexOf(componentId) != -1) {
                        componentSplitter.rightSplitter = vertSplitterDSList[index];
                        matchCount++;
                    }
                    if (vertSplitterDSList[index].RightComponentIds.indexOf(componentId) != -1) {
                        componentSplitter.leftSplitter = vertSplitterDSList[index];
                        matchCount++;
                    }
                    if (matchCount == 2) {
                        break;
                    }
                }
            }
            return componentSplitter;
        };

        var getModelElement = function (componentId, componentType) {
            var component;
            switch (componentType) {
                case Util.CI.ComponentType.Container:
                    component = Container.getContainer(componentId);
                    break;
                case Util.CI.ComponentType.Floor:
                    component = Floor.getFloor(componentId);
                    break;
            }
            return component;
        };

        function createLayoutObject(componentId, componentType) {
            var offsetToUse = getDefaultOffset(componentType).offset;
            var layout = new getLayout();
            var componentLayout = new CI.LayoutComponent();
            var modelElem = getModelElement(componentId, componentType);
            componentLayout.ComponentId = componentId;
            componentLayout.ComponentType = componentType;
            componentLayout.TopPercent = 0;
            componentLayout.LeftPercent = 0;
            componentLayout.WidthPercent = 100;
            componentLayout.HeightPercent = 100;
            if (modelElem) {
                componentLayout.ViewDefId = modelElem.viewdefid;
            }
            layout.components.push(componentLayout);
            populateSplitters(layout, offsetToUse);
            return layout;
        }

        var VerifySpaceAllocationToDraggedAndDestinationContainer = function (destinationComponent,
            draggedComponent,
            destinationLayout,
            draggedComponentMinHeight,
            draggedComponentMinWidth,
            destinationComponentMinHeight,
            destinationComponentMinWidth,
            defaultOffset,
            sourceComponentType) {

            if (DragDropInfoObject) {
                switch (DragDropInfoObject.overlayPosition) {
                    case "s":
                    case "n":
                        if ((destinationComponent.Height - defaultOffset) / 2 < destinationComponentMinHeight ||
                            (destinationComponent.Height - defaultOffset) / 2 < draggedComponentMinHeight) {
                            return false;
                        } else {
                            return true;
                        }
                    case "e":
                    case "w":
                        if ((destinationComponent.Width - defaultOffset) / 2 < destinationComponentMinWidth ||
                            (destinationComponent.Width - defaultOffset) / 2 < draggedComponentMinWidth) {
                            return false;
                        } else {
                            return true;
                        }
                    case "c":
                        if (destinationComponent.Width < draggedComponentMinWidth ||
                            draggedComponent.Width < destinationComponentMinWidth ||
                            destinationComponent.Height < draggedComponentMinHeight ||
                            draggedComponent.Height < destinationComponentMinHeight ||
                            !Util.GetElementScope(destinationComponent.ComponentId) ||
                            Util.GetElementScope(destinationComponent.ComponentId).$parent.vm.type != Util.CI.ComponentType.Floor ||
                            sourceComponentType != Util.CI.ComponentType.Floor ||
                            draggedComponent.pinState == Util.CI.PinState.LeftCard) {
                            return false;
                        } else {
                            return true;
                        }
                }
            }
            return true;
        };

        var allotSpaceToOtherContainers = function (deletedComponentinDS, layout, defaultOffset) {
            var horSplitters = layout.horSplittersSortedByTopLeft;
            var vertSplitters = layout.vertSplittersSortedByLeftTop;
            var components = layout.components;
            var matchFound = false;

            for (var count = 0; count < horSplitters.length; count++) {
                if (horSplitters[count].TopComponentIds.indexOf(deletedComponentinDS.ComponentId) != -1 &&
                    deletedComponentinDS.Width >= (horSplitters[count].Width - defaultOffset) &&
                    deletedComponentinDS.Width <= (horSplitters[count].Width + defaultOffset)) {
                    for (var counter = 0; counter < components.length; counter++) {
                        if (horSplitters[count].BottomComponentIds.indexOf(components[counter].ComponentId) != -1) {
                            components[counter].HeightPercent += deletedComponentinDS.HeightPercent;
                            components[counter].Height += deletedComponentinDS.Height + defaultOffset;

                            components[counter].TopPercent = deletedComponentinDS.TopPercent;
                            components[counter].Top = deletedComponentinDS.Top;

                            matchFound = true;

                        }
                    }
                }
            }

            if (!matchFound) {
                for (var count = 0; count < vertSplitters.length; count++) {
                    if (vertSplitters[count].RightComponentIds.indexOf(deletedComponentinDS.ComponentId) != -1 &&
                        deletedComponentinDS.Height >= (vertSplitters[count].Height - defaultOffset) &&
                        deletedComponentinDS.Height <= (vertSplitters[count].Height + defaultOffset)) {
                        for (var counter = 0; counter < components.length; counter++) {
                            if (vertSplitters[count].LeftComponentIds.indexOf(components[counter].ComponentId) != -1) {
                                components[counter].WidthPercent += deletedComponentinDS.WidthPercent;
                                components[counter].Width += deletedComponentinDS.Width + defaultOffset;

                                matchFound = true;
                            }
                        }
                    }
                }
            }

            if (!matchFound) {
                for (var count = 0; count < horSplitters.length; count++) {
                    if (horSplitters[count].BottomComponentIds.indexOf(deletedComponentinDS.ComponentId) != -1 &&
                        deletedComponentinDS.Width >= (horSplitters[count].Width - defaultOffset) &&
                        deletedComponentinDS.Width <= (horSplitters[count].Width + defaultOffset)) {
                        for (var counter = 0; counter < components.length; counter++) {
                            if (horSplitters[count].TopComponentIds.indexOf(components[counter].ComponentId) != -1) {
                                components[counter].HeightPercent += deletedComponentinDS.HeightPercent;
                                components[counter].Height += deletedComponentinDS.Height + defaultOffset;

                                matchFound = true;

                            }
                        }
                    }
                }
            }

            if (!matchFound) {
                for (var count = 0; count < vertSplitters.length; count++) {
                    if (vertSplitters[count].LeftComponentIds.indexOf(deletedComponentinDS.ComponentId) != -1 &&
                        deletedComponentinDS.Height >= (vertSplitters[count].Height - defaultOffset) &&
                        deletedComponentinDS.Height <= (vertSplitters[count].Height + defaultOffset)) {
                        for (var counter = 0; counter < components.length; counter++) {
                            if (vertSplitters[count].RightComponentIds.indexOf(components[counter].ComponentId) != -1) {
                                components[counter].WidthPercent += deletedComponentinDS.WidthPercent;
                                components[counter].Width += deletedComponentinDS.Width + defaultOffset;

                                components[counter].LeftPercent = deletedComponentinDS.LeftPercent;
                                components[counter].Left = deletedComponentinDS.Left;

                                matchFound = true;
                            }
                        }
                    }
                }
            }
        };

        var createCopyAndReturnNewReference = function (layout) {
            var layout = JSON.parse(JSON.stringify(layout));
            //var layout = $.extend(true, {}, layout);
            return layout;
        }

        var onComponentDeleteforSwap = function (layout, deleteComponent) {
            var deletedComponentIndex = 0;
            if (layout) {
                var components = layout.components;
                for (var count = 0; count < components.length; count++) {
                    if (components[count].ComponentId == deleteComponent.ComponentId) {
                        deletedComponentIndex = count;
                        components.splice(deletedComponentIndex, 1);
                        break;
                    }
                }
            }
        };

        var getLayoutToBeUpdatedAfterComponentDelete = function (logicalScreenIndex, componentsToDelete) {
            // componentsToDelete is list PageManager.LayoutComponentInfo objects 
            var layoutOfLogicalScreen = getLogicalScreenLayoutFromScreenIndex(logicalScreenIndex);
            var layoutCopyOfLogicalScreen = createCopyAndReturnNewReference(layoutOfLogicalScreen);
            if (componentsToDelete && componentsToDelete.length) {
                for (var counter = 0; counter < componentsToDelete.length; counter++) {
                    var deleteComponentObj = {
                        'ComponentId': componentsToDelete[counter].componentid
                    }
                    onComponentDeleteNew(layoutCopyOfLogicalScreen, deleteComponentObj, null, Util.CI.ComponentType.Floor);
                }
            }
            return {
                layoutStr: JSON.stringify(layoutCopyOfLogicalScreen),
                isEmpty: isLayoutComponentEmpty(layoutCopyOfLogicalScreen)
            }
        };

        var onComponentDeleteNew = function (layout, deleteComponent, parentLayout, parentComponentType) {
            if (parentComponentType === undefined) {
                parentComponentType = parentLayout.ComponentType;
            }
            var defaultOffset = getDefaultOffset(parentComponentType).offset;
            var offsetToUse = getDefaultOffset(Util.CI.ComponentType.Floor).offset;
            var deletedComponentIndex = 0;
            var deletedComponentinDS;
            var layoutToRet = layout;
            if (layout && layout.components !== undefined) {
                var components = layout.components;
                for (var count = 0; count < components.length; count++) {
                    if (components[count].ComponentId == deleteComponent.ComponentId) {
                        deletedComponentinDS = components[count];
                        deletedComponentIndex = count;
                        allotSpaceToOtherContainers(deletedComponentinDS, layout, defaultOffset);
                        components.splice(deletedComponentIndex, 1);
                        break;
                    }
                }
                if (components.length == 0) {
                    layoutToRet = null;
                } else {
                    populateSplitters(layoutToRet, offsetToUse);
                }
            }
            return layoutToRet;
        };

        var getFirstComponentOfScreen = function (screenNo) {
            if (screenNo >= 0 && screenNo < TotalAvailableLogicalScreen) {
                var layoutId = screenNo + '_' + $rootScope.floorId;
                var layout = parentComponentLayoutMap.get(layoutId);

                if (!layout) {
                    return false;
                }

                var horSplitters = layout.horSplittersSortedByTopLeft;

                if (horSplitters.length <= 0 || layout.components.length <= 0) {
                    return false;
                }

                var splitter = horSplitters[0].BottomComponentIds.split(',');

                for (var componentIndex = 0; componentIndex < layout.components.length; componentIndex++) {
                    if (splitter[0] == layout.components[componentIndex].ComponentId) {
                        return layout.components[componentIndex];
                    }
                }
            }
        };

        var onComponentResizeStart = function (parentLayout, resizeComponent, HandlerString) {
            var layout = null;

            if (parentLayout.ComponentType == "FLOOR") {
                layout = getLogicalScreenLayoutfromComponent(resizeComponent.ComponentId);
            }
            var defaultOffset = getDefaultOffset(parentLayout.ComponentType).offset;
            var splitterDivThickness = Math.max(defaultOffset, 1);

            if (layout) {
                var topOffset = 0;
                var leftOffset = 0;
                if (HandlerString) {
                    var resizeDiv = document.getElementById("resizeHandleDiv");
                    switch (HandlerString[HandlerString.length - 1]) {
                        case "n":
                            for (var count = 0; count < layout.horSplittersSortedByTopLeft.length; count++) {
                                if (layout.horSplittersSortedByTopLeft[count].BottomComponentIds.indexOf(resizeComponent.ComponentId) != -1) {
                                    var splitter = layout.horSplittersSortedByTopLeft[count];
                                    ResizeInfoObject = new resizeInfoObject(splitter, "n", splitter.Top, splitter.Left);
                                    resizeDiv.style.top = (topOffset + layout.horSplittersSortedByTopLeft[count].Top) + "px";
                                    resizeDiv.style.left = (leftOffset + layout.horSplittersSortedByTopLeft[count].Left) + "px";
                                    //Set width as splitter length
                                    resizeDiv.style.height = splitterDivThickness + "px";
                                    resizeDiv.style.width = layout.horSplittersSortedByTopLeft[count].Width + "px";
                                    break;
                                }
                            }
                            break;
                        case "e":
                            for (var count = 0; count < layout.vertSplittersSortedByLeftTop.length; count++) {
                                if (layout.vertSplittersSortedByLeftTop[count].LeftComponentIds.indexOf(resizeComponent.ComponentId) != -1) {
                                    var splitter = layout.vertSplittersSortedByLeftTop[count];
                                    ResizeInfoObject = new resizeInfoObject(splitter, "e", splitter.Top, splitter.Left);
                                    resizeDiv.style.top = (topOffset + layout.vertSplittersSortedByLeftTop[count].Top) + "px";
                                    resizeDiv.style.left = (leftOffset + layout.vertSplittersSortedByLeftTop[count].Left - defaultOffset) + "px";
                                    //Set width as splitter length
                                    resizeDiv.style.height = layout.vertSplittersSortedByLeftTop[count].Height + "px";
                                    resizeDiv.style.width = splitterDivThickness + "px";
                                    break;
                                }
                            }
                            break;
                        case "s":
                            for (var count = 0; count < layout.horSplittersSortedByTopLeft.length; count++) {
                                if (layout.horSplittersSortedByTopLeft[count].TopComponentIds.indexOf(resizeComponent.ComponentId) != -1) {
                                    var splitter = layout.horSplittersSortedByTopLeft[count];
                                    ResizeInfoObject = new resizeInfoObject(splitter, "s", splitter.Top, splitter.Left);
                                    resizeDiv.style.top = (topOffset + layout.horSplittersSortedByTopLeft[count].Top - defaultOffset) + "px";
                                    resizeDiv.style.left = (leftOffset + layout.horSplittersSortedByTopLeft[count].Left) + "px";
                                    //Set width as splitter length
                                    resizeDiv.style.height = splitterDivThickness + "px";
                                    resizeDiv.style.width = layout.horSplittersSortedByTopLeft[count].Width + "px";
                                    break;
                                }
                            }
                            break;
                        case "w":
                            for (var count = 0; count < layout.vertSplittersSortedByLeftTop.length; count++) {
                                if (layout.vertSplittersSortedByLeftTop[count].RightComponentIds.indexOf(resizeComponent.ComponentId) != -1) {
                                    var splitter = layout.vertSplittersSortedByLeftTop[count];
                                    ResizeInfoObject = new resizeInfoObject(splitter, "w", splitter.Top, splitter.Left);
                                    resizeDiv.style.top = (topOffset + layout.vertSplittersSortedByLeftTop[count].Top) + "px";
                                    resizeDiv.style.left = (leftOffset + layout.vertSplittersSortedByLeftTop[count].Left) + "px";
                                    //Set width as splitter length
                                    resizeDiv.style.height = layout.vertSplittersSortedByLeftTop[count].Height + "px";
                                    resizeDiv.style.width = splitterDivThickness + "px";
                                    break;
                                }
                            }
                            break;

                    }
                }
            }
        };

        var hasMinHeightWidthReachedAfterResize = function (parentLayout, componentPreResize, componentPostResize) {
            var layout = null;

            if (parentLayout.ComponentType == "FLOOR") {
                layout = getLogicalScreenLayoutfromComponent(componentPreResize.ComponentId);
            }

            if (layout && ResizeInfoObject) {
                var components = layout.components;
                var Splitter = ResizeInfoObject.Splitter;
                var handler = ResizeInfoObject.HandlerString;

                switch (handler) {
                    case "n":
                    case "s":
                        var changeInHeight = 0;
                        if ("n" == handler) {
                            changeInHeight = componentPostResize.size.height - componentPreResize.Height;
                        } else {
                            changeInHeight = componentPreResize.Height - componentPostResize.size.height;
                        }

                        for (var count = 0; count < components.length; count++) {
                            if (Container.getContainer(components[count].ComponentId)) {
                                if (Splitter.BottomComponentIds.indexOf(components[count].ComponentId) != -1) {
                                    if (components[count].Height + changeInHeight <= Container.getContainer(components[count].ComponentId).minHeight) {
                                        return Container.getContainer(components[count].ComponentId).minHeight;
                                    }
                                }
                                if (Splitter.TopComponentIds.indexOf(components[count].ComponentId) != -1) {
                                    if (components[count].Height - changeInHeight <= Container.getContainer(components[count].ComponentId).minHeight) {
                                        return Container.getContainer(components[count].ComponentId).minHeight;
                                    }
                                }
                            }
                        }
                        break;
                    case "e":
                    case "w":
                        var changeInWidth = 0;

                        if ("e" == handler) {
                            changeInWidth = componentPreResize.Width - componentPostResize.size.width;
                        } else {
                            changeInWidth = componentPostResize.size.width - componentPreResize.Width;
                        }

                        for (var count = 0; count < components.length; count++) {
                            if (Container.getContainer(components[count].ComponentId)) {
                                if (Splitter.RightComponentIds.indexOf(components[count].ComponentId) != -1) {
                                    if (components[count].Width + changeInWidth < Container.getContainer(components[count].ComponentId).minWidth) {
                                        return Container.getContainer(components[count].ComponentId).minWidth;
                                    }
                                }
                                if (Splitter.LeftComponentIds.indexOf(components[count].ComponentId) != -1) {
                                    if (components[count].Width - changeInWidth < Container.getContainer(components[count].ComponentId).minWidth) {
                                        return Container.getContainer(components[count].ComponentId).minWidth;
                                    }
                                }
                            }
                        }
                        break;
                    default:
                }
            }
            return 0;
        };

        var getEffectiveChange = function (parentLayout, componentPreResize, componentPostResize) {
            var layout = null;

            if (parentLayout.ComponentType == "FLOOR") {
                layout = getLogicalScreenLayoutfromComponent(componentPreResize.ComponentId);
            }
            var defaultOffset = getDefaultOffset(parentLayout.ComponentType).offset;

            if (layout) {
                var components = layout.components;
                var Splitter = ResizeInfoObject.Splitter;
                var handler = ResizeInfoObject.HandlerString;

                switch (handler) {
                    case "n":
                    case "s":
                        var newTop = ResizeInfoObject.Top;
                        var oldTop = ResizeInfoObject.Splitter.Top;

                        var changeInHeight = newTop - oldTop;
                        if (changeInHeight != 0) {
                            var change1 = MAX_VAL;
                            var change2 = MAX_VAL;
                            for (var count = 0; count < components.length; count++) {
                                if (Container.getContainer(components[count].ComponentId)) {
                                    if (change1 == MAX_VAL && Splitter.BottomComponentIds.indexOf(components[count].ComponentId) != -1) {
                                        if (components[count].Height - changeInHeight <= Container.getContainer(components[count].ComponentId).minHeight) {
                                            change1 = changeInHeight + (components[count].Height - changeInHeight - Container.getContainer(components[count].ComponentId).minHeight);
                                        }
                                    }
                                    if (change2 == MAX_VAL && Splitter.TopComponentIds.indexOf(components[count].ComponentId) != -1) {
                                        if (components[count].Height + changeInHeight <= Container.getContainer(components[count].ComponentId).minHeight) {
                                            change2 = changeInHeight - (components[count].Height + changeInHeight - Container.getContainer(components[count].ComponentId).minHeight);
                                        }
                                    }
                                }
                            }
                        }

                        var minChange = changeInHeight;

                        if (change1 < minChange) {
                            minChange = change1;
                        }

                        if (change2 < minChange) {
                            minChange = change2;
                        }

                        return minChange;
                    case "e":
                    case "w":
                        var newLeft = ResizeInfoObject.Left;
                        var oldLeft = ResizeInfoObject.Splitter.Left;
                        var changeInWidth = newLeft - oldLeft;

                        var change1 = MAX_VAL;
                        var change2 = MAX_VAL;
                        if (changeInWidth != 0) {
                            for (var count = 0; count < components.length; count++) {
                                if (Container.getContainer(components[count].ComponentId)) {
                                    if (change1 == MAX_VAL && Splitter.RightComponentIds.indexOf(components[count].ComponentId) != -1) {
                                        if (components[count].Width - changeInWidth < Container.getContainer(components[count].ComponentId).minWidth) {
                                            change1 = changeInWidth + (components[count].Width - changeInWidth - Container.getContainer(components[count].ComponentId).minWidth);
                                        }
                                    }
                                    if (change2 == MAX_VAL && Splitter.LeftComponentIds.indexOf(components[count].ComponentId) != -1) {
                                        if (components[count].Width + changeInWidth < Container.getContainer(components[count].ComponentId).minWidth) {
                                            change2 = changeInWidth - (components[count].Width + changeInWidth - Container.getContainer(components[count].ComponentId).minWidth);
                                        }
                                    }
                                }
                            }
                        }

                        var minChange = changeInWidth;

                        if (change1 < minChange) {
                            minChange = change1;
                        }

                        if (change2 < minChange) {
                            minChange = change2;
                        }

                        return minChange;
                    default:
                }
            }
        };

        var resizeLayoutNew = function (layoutCopy, parentLayout, componentPostResize) {
            var layout = null;
            var offsetObj = getDefaultOffset(parentLayout.ComponentType);
            var componentPreResize;

            if (layoutCopy && ResizeInfoObject) {
                var components = layoutCopy.components;

                for (var count = 0; count < components.length; count++) {
                    if (components[count].ComponentId == componentPostResize.ComponentId) {
                        componentPreResize = components[count];
                        break;
                    }
                }

                var Splitter = ResizeInfoObject.Splitter;

                var handler = ResizeInfoObject.HandlerString;

                switch (handler) {
                    case "n":
                    case "s":
                        var changeInHeight = getEffectiveChange(parentLayout, componentPreResize, componentPostResize);

                        if (0 == changeInHeight) {
                            return false;
                        }

                        for (var count = 0; count < components.length; count++) {
                            if (Splitter.BottomComponentIds.indexOf(components[count].ComponentId) != -1) {
                                //components[count].TopPercent = ((components[count].Top + changeInHeight) * components[count].TopPercent) / components[count].Top;
                                components[count].TopPercent += components[count].HeightPercent - (((components[count].Height + offsetObj.offset - changeInHeight) * components[count].HeightPercent) / (components[count].Height + offsetObj.offset));
                                components[count].Top += changeInHeight;

                                components[count].HeightPercent = ((components[count].Height + offsetObj.offset - changeInHeight) * components[count].HeightPercent) / (components[count].Height + offsetObj.offset);
                                components[count].Height -= changeInHeight;

                            }
                            if (Splitter.TopComponentIds.indexOf(components[count].ComponentId) != -1) {
                                components[count].HeightPercent = ((components[count].Height + offsetObj.offset + changeInHeight) * components[count].HeightPercent) / (components[count].Height + offsetObj.offset);
                                components[count].Height += changeInHeight;
                            }
                        }

                        break;
                    case "e":
                    case "w":
                        var changeInWidth = getEffectiveChange(parentLayout, componentPreResize, componentPostResize);
                        if (0 == changeInWidth) {
                            return false;
                        }

                        for (var count = 0; count < components.length; count++) {
                            if (Splitter.RightComponentIds.indexOf(components[count].ComponentId) != -1) {
                                //components[count].LeftPercent = ((components[count].Left + changeInWidth) * components[count].LeftPercent) / components[count].Left;
                                components[count].LeftPercent += components[count].WidthPercent - ((components[count].Width + offsetObj.offset - changeInWidth) * components[count].WidthPercent) / (components[count].Width + offsetObj.offset);
                                components[count].Left += changeInWidth;

                                components[count].WidthPercent = ((components[count].Width + offsetObj.offset - changeInWidth) * components[count].WidthPercent) / (components[count].Width + offsetObj.offset);
                                components[count].Width -= changeInWidth;
                            }

                            if (Splitter.LeftComponentIds.indexOf(components[count].ComponentId) != -1) {
                                components[count].WidthPercent = ((components[count].Width + offsetObj.offset + changeInWidth) * components[count].WidthPercent) / (components[count].Width + offsetObj.offset);
                                components[count].Width += changeInWidth;
                            }
                        }
                        break;
                    default:
                }
                return true;
            }
            return false;
        };

        var onComponentResizeStopNew = function (parentLayout, componentPostResize) {
            if (!ResizeInfoObject) {
                return;
            }

            var resizeDiv = document.getElementById("resizeHandleDiv");
            resizeDiv.style.display = "none";

            var Oldlayout = null;
            if (parentLayout.ComponentType == "FLOOR") {
                layout = getLogicalScreenLayoutfromComponent(componentPostResize.ComponentId);
            }
            //paint old layout 
            paint(parentLayout);
            var layoutCopy = createCopyAndReturnNewReference(layout);
            if (false == resizeLayoutNew(layoutCopy, parentLayout, componentPostResize)) {
                //Resizing the component has failed due to several possible conditions like:
                //1. Container reached min height width etc.
                //2. Container was not resized beyond a threshold
                //TODO:             
            }
            ResizeInfoObject = null;
            var logicalScreenNo = getLogicalScreenNumberfromComponent(componentPostResize.ComponentId);
            var floorScope = Util.GetElementScope($rootScope.floorId).vm;
            var screenInfo = floorScope.prepareAndGetScreenUpdateInfoObj($rootScope.floorId, logicalScreenNo, JSON.stringify(layoutCopy), null, null, false, false);
            return screenInfo;
        };

        var onComponentResize = function (parentLayout, componentPostResize, postResizeUIElement) {
            var layout = null;
            if (parentLayout.ComponentType == "FLOOR") {
                layout = getLogicalScreenLayoutfromComponent(componentPostResize.ComponentId);
            }
            var componentPreResize;

            if (!layout || !ResizeInfoObject) {
                return;
            }

            var components = layout.components;
            for (var count = 0; count < components.length; count++) {
                if (components[count].ComponentId == componentPostResize.ComponentId) {
                    componentPreResize = components[count];
                    break;
                }
            }

            //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////        	
            //
            //          STARTS HERE
            //          Section to handle min height and min width condition
            //          This section will ensure: Containers can not be resized (reduced) beyond their min height and min width during resizing
            //
            //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
            if (hasMinHeightWidthReachedAfterResize(parentLayout, componentPreResize, postResizeUIElement) != 0) {
                return;
            }
            //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
            //
            //        	          ENDS HERE
            //        	          Section to handle min height and min width condition
            //        	          This section will ensure: Containers can not be resized (reduced) beyond their min height and min width during resizing
            //
            //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


            //Do all of the below only if it is a valid resize request.

            var Splitter = ResizeInfoObject.Splitter;
            var top = Splitter.Top;
            var left = Splitter.Left;
            var handler = ResizeInfoObject.HandlerString;
            var resizeDiv = document.getElementById("resizeHandleDiv");
            var topOffset = 0;
            var leftOffset = 0;
            switch (handler) {
                case "n":
                    top = (top + componentPreResize.Height - postResizeUIElement.size.height);
                    top = getLeftOrTopToMatchClosestSplitter(layout, handler, top);
                    ResizeInfoObject.setTop(top);
                    resizeDiv.style.top = (top + topOffset) + 'px';
                    break;
                case "s":
                    top = (top + postResizeUIElement.size.height - componentPreResize.Height);
                    top = getLeftOrTopToMatchClosestSplitter(layout, handler, top);
                    ResizeInfoObject.setTop(top);
                    resizeDiv.style.top = (top + topOffset) + 'px';
                    break;
                case "e":
                    left = (left + postResizeUIElement.size.width - componentPreResize.Width);
                    left = getLeftOrTopToMatchClosestSplitter(layout, handler, left);
                    ResizeInfoObject.setLeft(left);
                    resizeDiv.style.left = (left + leftOffset) + 'px';
                    break;
                case "w":
                    left = (left + componentPreResize.Width - postResizeUIElement.size.width);
                    left = getLeftOrTopToMatchClosestSplitter(layout, handler, left);
                    ResizeInfoObject.setLeft(left);
                    resizeDiv.style.left = (left + leftOffset) + 'px';
                    break;
                default:
            }
            resizeDiv.style.display = "block";
        };

        var getLeftOrTopToMatchClosestSplitter = function (layout, handler, currentPosition) {
            var LeftOrTop = currentPosition;
            var horSplitters = layout.horSplittersSortedByTopLeft;
            var vertSplitters = layout.vertSplittersSortedByLeftTop;
            var closestVertSplitter = null;
            var closestHorSplitter = null;

            for (var horSplitterIndex = 0; horSplitterIndex < horSplitters.length; horSplitterIndex++) {
                if ((Double.greaterOrEqualWithPrecision(horSplitters[horSplitterIndex].Top, (currentPosition - closestSplitterOffset)) &&
                    Double.lessOrEqualWithPrecision(horSplitters[horSplitterIndex].Top, currentPosition)) ||
                    (Double.greaterOrEqualWithPrecision(horSplitters[horSplitterIndex].Top, currentPosition) &&
                        Double.lessOrEqualWithPrecision(horSplitters[horSplitterIndex].Top, (currentPosition + closestSplitterOffset)))
                ) {
                    closestHorSplitter = horSplitters[horSplitterIndex];
                    break;
                }
            }

            for (var vertSplitterIndex = 0; vertSplitterIndex < vertSplitters.length; vertSplitterIndex++) {
                if ((Double.greaterOrEqualWithPrecision(vertSplitters[vertSplitterIndex].Left, (currentPosition - closestSplitterOffset)) &&
                    Double.lessOrEqualWithPrecision(vertSplitters[vertSplitterIndex].Left, currentPosition)) ||
                    (Double.greaterOrEqualWithPrecision(vertSplitters[vertSplitterIndex].Left, currentPosition) &&
                        Double.lessOrEqualWithPrecision(vertSplitters[vertSplitterIndex].Left, (currentPosition + closestSplitterOffset)))
                ) {
                    closestVertSplitter = vertSplitters[vertSplitterIndex];
                    break;
                }
            }

            switch (handler) {
                case "n":
                case "s":
                    if (closestHorSplitter) {
                        LeftOrTop = closestHorSplitter.Top;
                    }
                    break;
                case "e":
                case "w":
                    if (closestVertSplitter) {
                        LeftOrTop = closestVertSplitter.Left;
                    }
                    break;
                default:
            }
            return LeftOrTop;
        };

        function UpdateComponentModel(layout, parentComponentId, parentComponentType) {
            var defaultOffset = getDefaultOffset(parentComponentType);
            switch (layout.ComponentType) {
                case Util.CI.ComponentType.Floor:
                    var objFloor = Floor.getFloor(layout.ComponentId);
                    if (typeof (objFloor) != 'undefined' && null != objFloor) {
                        objFloor.height = layout.Height;
                        objFloor.width = layout.Width;
                        objFloor.top = layout.Top;
                        objFloor.left = layout.Left;
                        Floor.updateModel(objFloor);
                    }
                    break;
                case Util.CI.ComponentType.Container:
                    var objContainer = Container.getContainer(layout.ComponentId);
                    var parentModel = getModelElement(parentComponentId, parentComponentType);

                    var layoutHeight = 0;
                    var layoutWidth = 0;
                    switch (parentComponentType) {
                        case Util.CI.ComponentType.Floor:
                            layoutHeight = parentModel.screenSize;
                            layoutWidth = parentModel.screenWidth;
                            break;
                    }

                    if (typeof (objContainer) != 'undefined' && null != objContainer) {
                        var logicalScreenNumber = getLogicalScreenNumberfromComponent(layout.ComponentId);
                        if (-1 == logicalScreenNumber) {
                            logicalScreenNumber = 0;
                        }

                        if (-1 != logicalScreenNumber) {
                            var newObj = {
                                componentId: layout.ComponentId
                            };
                            var sideOffsetAdjustedscreenWidth = layoutWidth - defaultOffset.bothSideOffset.right - (defaultOffset.bothSideOffset.left - defaultOffset.offset);
                            var topOffsetAdjustedscreenHeight = layoutHeight - defaultOffset.bothSideOffset.bottom - (defaultOffset.bothSideOffset.top - defaultOffset.offset);

                            newObj.height = (layout.HeightPercent * topOffsetAdjustedscreenHeight / 100) - defaultOffset.offset;
                            newObj.top = ((layout.TopPercent * topOffsetAdjustedscreenHeight / 100) + defaultOffset.bothSideOffset.top) + (logicalScreenNumber * layoutHeight);

                            newObj.width = (layout.WidthPercent * sideOffsetAdjustedscreenWidth / 100) - defaultOffset.offset;
                            newObj.left = (layout.LeftPercent * sideOffsetAdjustedscreenWidth / 100) + defaultOffset.bothSideOffset.left;
                            if ($rootScope.viewonlymode === false) {
                                newObj.relativeTop = newObj.top;
                            } else {
                                newObj.relativeTop = (layout.TopPercent * topOffsetAdjustedscreenHeight / 100) + defaultOffset.bothSideOffset.top;
                            }
                            if (!objContainer.isFullScreen) {
                                Container.updateModel(newObj);
                            } else {
                                var floorScope = Util.GetElementScope($rootScope.floorId).vm;
                                floorScope.resizeFullScreenContainer();
                            }
                            layout.Height = newObj.height;
                            layout.Width = newObj.width;
                            layout.Top = newObj.top;
                            layout.Left = newObj.left;
                        }
                    }
                    break;
                default:
                    break;
            }
        }

        function getLayoutObjectFromMap(componentMap) {
            var layoutObj = {};
            if (componentMap != null && componentMap != undefined && componentMap != "") {
                var oldObj = JSON.parse(componentMap);
                var keys = oldObj.keys;
                var data = oldObj.data;
                var tempLayoutsMap = new Map();
                tempLayoutsMap.setMap(keys, data);
                for (var layoutCounter = 0; layoutCounter < keys.length; layoutCounter++) {
                    var layoutNew = new getLayout();
                    var layoutOld = tempLayoutsMap.get(keys[layoutCounter]);
                    layoutNew.components = layoutOld.components;

                    for (var horSplIndex = 0; horSplIndex < layoutOld.horSplittersSortedByTopLeft.length; horSplIndex++) {
                        var oldSplitter = layoutOld.horSplittersSortedByTopLeft[horSplIndex];
                        var horSplitter = new HorSplitter(oldSplitter.Width, oldSplitter.Top, oldSplitter.Left, oldSplitter.TopComponentIds, oldSplitter.BottomComponentIds);
                        layoutNew.horSplittersSortedByTopLeft.push(horSplitter);
                    }

                    for (var vertSplIndex = 0; vertSplIndex < layoutOld.vertSplittersSortedByLeftTop.length; vertSplIndex++) {
                        var oldSplitter = layoutOld.vertSplittersSortedByLeftTop[vertSplIndex];
                        var vertSplitter = new VertSplitter(oldSplitter.Height, oldSplitter.Top, oldSplitter.Left, oldSplitter.LeftComponentIds, oldSplitter.RightComponentIds);
                        layoutNew.vertSplittersSortedByLeftTop.push(vertSplitter);
                    }
                    layoutObj[keys[layoutCounter]] = layoutNew;
                }
            }
            return layoutObj;
        }

        var repaintLayout = function () {
            var floorLayout = new CI.LayoutComponent();
            floorLayout.ComponentId = $rootScope.floorId;
            floorLayout.ComponentType = Util.CI.ComponentType.Floor;
            paint(floorLayout);
        };

        var getContainerFromMouseCoords = function (components, mouseCoords) {

            var return_container;
            var curr_left = mouseCoords.x;
            var curr_top = mouseCoords.y;
            for (var count = 0; count < components.length; count++) {
                var left = components[count].Left;
                var top = components[count].Top;
                var final_left = components[count].Left + components[count].Width;
                var final_top = components[count].Top + components[count].Height;

                if (curr_left >= left && curr_left <= final_left && curr_top >= top && curr_top <= final_top) {
                    return_container = components[count];

                    return return_container;
                }
            }
        };

        var getAbsoluteMouseCoords = function (curr_abs_elem_id, curr_mousecoords) {
            var viewDiv = document.getElementById(curr_abs_elem_id);
            var tmpX = 0;
            var tmpY = 0;
            while (viewDiv) {
                tmpX += viewDiv.offsetLeft - viewDiv.scrollLeft;
                tmpY += viewDiv.offsetTop - viewDiv.scrollTop;
                viewDiv = viewDiv.offsetParent;
            }
            curr_mousecoords.x -= tmpX;
            curr_mousecoords.y -= tmpY;
            return curr_mousecoords;
        };

        var isValidDrop = function (dragInfo, mouseCoords) {
            var parentId = dragInfo.destComponentId;

            var concatenatedId = null;
            if (parentId && Floor.getFloor(parentId)) {
                concatenatedId = CurrentLogicalScreen + "_" + parentId;
            }
            var layout = parentComponentLayoutMap.get(concatenatedId);

            if (layout) {
                var absolute_coords = getAbsoluteMouseCoords(parentId, mouseCoords);

                var curr_container = getContainerFromMouseCoords(layout.components, absolute_coords);

                if (curr_container != null && typeof (curr_container.ComponentId) != 'undefined' && curr_container.ComponentId != null) {
                    return true;
                } else {
                    return false;
                }
            }
        };


        var getComponentsArrayForLogicalScreen = function () {
            var maxLogicalScreenNo = -1;
            var screenComponents = {};
            if (parentComponentLayoutMap) {
                parentComponentLayoutMap.each(function (id, layout, index) {
                    if (id.indexOf("_") != -1) {
                        screenComponents[id] = JSON.parse(JSON.stringify(layout.components));
                        var currentId = id.split('_')[0];
                        if (maxLogicalScreenNo < currentId) {
                            maxLogicalScreenNo = parseInt(currentId);
                        }
                    }
                });

                if ((maxLogicalScreenNo + 1) < TotalAvailableLogicalScreen) {
                    var dummyId = (maxLogicalScreenNo + 1) + "_" + $rootScope.floorId;
                    screenComponents[dummyId] = [];
                }
            }
            return screenComponents;
        };

        var getCurrentLogicalScreen = function () {
            return CurrentLogicalScreen;
        };

        var getTotalLogicalScreens = function () {
            return TotalAvailableLogicalScreen;
        };

        function triggerEventForLogicalScreenCount(screenCount) {
            $.event.trigger({
                type: "LogicalScreenCount",
                message: "Logical Screen count Changed",
                time: new Date(),
                screenCount: screenCount
            });
        }


        function getComponentMap(logicalScreenNo, componentId) {
            var layout = null;
            if (logicalScreenNo >= 0) {
                var layoutKey = logicalScreenNo + '_' + $rootScope.floorId;
                layout = parentComponentLayoutMap.get(layoutKey);
            }
            var components = [];
            if (layout) {
                components = layout.components;
            }
            return components;
        }

        function insertLogicalScreen(logicalScreenNo, layoutStr) {
            var totalCount = TotalAvailableLogicalScreen;
            for (var index = totalCount; index >= logicalScreenNo; index--) {
                var tempSrcLogicalScreenKey = index + '_' + $rootScope.floorId;
                var tempDestLogicalScreenKey = (index + 1) + '_' + $rootScope.floorId;

                var sourceLayout = parentComponentLayoutMap.get(tempSrcLogicalScreenKey);
                if (sourceLayout && sourceLayout.components.length > 0) {
                    parentComponentLayoutMap.put(tempDestLogicalScreenKey, sourceLayout);
                }
            }
            var layoutKey = logicalScreenNo + '_' + $rootScope.floorId;
            var layout = null;
            if (layoutStr) {
                var layoutObj = getLayoutObjectFromMap(layoutStr);
                for (var id in layoutObj) {
                    layout = layoutObj[id];
                    break;
                }
                parentComponentLayoutMap.put(layoutKey, layout);
            } else {
                if (TotalAvailableLogicalScreen + 1 != logicalScreenNo + 1) {
                    // Add Only if Not the Last Screen
                    layout = new getLayout();
                    parentComponentLayoutMap.put(layoutKey, layout);
                }
            }
            setTotalLogicalScreen(TotalAvailableLogicalScreen + 1);
        }

        function setLogicalScreenLayout(logicalScreenNo, layout) {
            var layoutKey = logicalScreenNo + '_' + $rootScope.floorId;
            if (layout.components && layout.components.length > 0) {
                var layoutNew = new getLayout();
                layoutNew.components = layout.components.slice(0);
                parentComponentLayoutMap.put(layoutKey, layoutNew);
                return true;
            } else {
                return false;
            }
        }

        function deleteLogicalScreenLayout(logicalScreenNo) {
            var layoutKey = logicalScreenNo + '_' + $rootScope.floorId;
            if (parentComponentLayoutMap.get(layoutKey)) {
                parentComponentLayoutMap.remove(layoutKey);
            }
        }

        return {
            MoveStart: moveStart,
            OnMoving: onMoving,
            MoveEnd: moveEnd,
            MoveEnter: moveEnter,
            MoveLeave: moveLeave,
            OnDrop: onDrop,
            onComponentResize: onComponentResize,
            onComponentResizeStart: onComponentResizeStart,
            onComponentResizeStopNew: onComponentResizeStopNew,
            arrangeEvenly: arrangeEvenly,
            arrangeSideBySide: arrangeSideBySide,
            arrangeStacked: arrangeStacked,
            RemoveExtraResizeHandles: removeExtraResizeHandles,
            moveVerticalScrollUp: moveVerticalScrollUp,
            moveVerticalScrollDown: moveVerticalScrollDown,
            SetCurrentLogicalScreen: setCurrentLogicalScreen,
            SetTotalLogicalScreen: setTotalLogicalScreen,
            OnWindowResizeEvent: onWindowResizeEvent,
            GetCurrentLogicalScreen: getCurrentLogicalScreen,
            GetTotalLogicalScreens: getTotalLogicalScreens,
            RepaintLayout: repaintLayout,
            GetLogicalScreenNumberfromComponent: getLogicalScreenNumberfromComponent,
            GetComponentsArrayForLogicalScreen: getComponentsArrayForLogicalScreen,
            GetLogicalScreenLayoutComponents: getLogicalScreenLayoutComponents,
            GetComponentMap: getComponentMap,
            InsertLogicalScreen: insertLogicalScreen,
            reset: reset,
            CreateLayoutObject: createLayoutObject,
            SetLogicalScreenLayout: setLogicalScreenLayout,
            DeleteLogicalScreenLayout: deleteLogicalScreenLayout,
            GetLayoutToBeUpdatedAfterComponentDelete: getLayoutToBeUpdatedAfterComponentDelete
        };
    }
]);

var CI = CI || {};

CI.LayoutComponent = function (componentId, componentType, top, left, width, height, ViewDefId) {
    this.ComponentId = componentId;
    this.ComponentType = componentType;
    this.Top = top;
    this.Left = left;
    this.Width = width;
    this.Height = height;
    this.TopPercent = 0;
    this.LeftPercent = 0;
    this.WidthPercent = 0;
    this.HeightPercent = 0;
    this.ViewDefId = ViewDefId;
};