sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/model/json/JSONModel",
	"odataconsumption/model/models"
],
function(Controller, JSONModel, Models) {
	"use strict";

	return Controller.extend("odataconsumption.controller.main", {

		/**
		 * List of numbers of values to be shown in the chart. Will be shown as radio buttons.
		 */
		SHOWN_VALUE_COUNTS: (function() {
			var shownValueCounts = [
				10,
				50,
				100,
				250,
				500
			];
			/**
			 * Converts a shownValueCounts value to its index in shownValueCounts and back. For use with
			 * 'selectedIndex' in lists or radio button groups.
			 */
			sap.ui.model.SimpleType.extend("odataconsumption.ShownValueCountToIndexConverter", {
				parseValue: function(index) {
					return shownValueCounts[index];
				},
				formatValue: function(count) {
					return shownValueCounts.indexOf(count);
				},
				validateValue: function(count) {
					return shownValueCounts.indexOf(count) !== -1;
				}
			});
			return shownValueCounts;
		})(),

		/**
		 * The update interval of the chart, if auto refresh is enabled.
		 */
		CHART_UPDATE_INTERVAL: 1000,

		_intervalId: null,
		_oViewModel: null,
		_oDeviceModel: null,
		_oDeviceTypesModel: null,
		_oDataModel: null,
		_oMeasureModel: null,
		_oChartModel: null,
		_oModelTileInput: null,
		oModel : null,
		_TileModel : null,

		/**
		 * This function is automatically called on startup
		 */
		onInit: function() {

			// Create models
			this._oViewModel = Models.createViewModel();
			this._oViewModel.setProperty('/shownValueCounts', this.SHOWN_VALUE_COUNTS);
			this._oViewModel.setProperty('/shownValueCount', this.SHOWN_VALUE_COUNTS[0]);
			this._oDataModel = Models.createODataModel();
			this._oDeviceModel = new JSONModel();
			this._oDeviceTypesModel = new JSONModel();
			this._oMeasureModel = new JSONModel();
			this._oChartModel = new JSONModel();
			this._oTileModel = new JSONModel();
			this._oModelTileInput = new JSONModel();
			this._TileModel = new sap.ui.model.json.JSONModel();
			var oModel = new sap.ui.model.json.JSONModel();

			// Set models to view
			this.getView().setModel(this._oViewModel, "viewModel");
			this.getView().setModel(this._oDeviceModel, "devices");
			this.getView().setModel(this._oDeviceTypesModel, "deviceTypes");
			this.getView().setModel(this._oMeasureModel, "measure");
			this.getView().setModel(this._oDataModel, "odata");
			this.getView().setModel(this._oChartModel, "chart");
			
			

			//Creation of JSON model for Tiles 

			oModel.loadData("./models/model.json");
			this.getView().setModel(oModel,"GlobalTile");
			

			//Once the model has been provisoned we can start updating the tiles
			oModel.attachRequestCompleted(function() {

				var testModel = new sap.ui.model.json.JSONModel();
				testModel.attachRequestCompleted(function() {
					//console.log(testModel.getJSON());
				oModel.setProperty("/TileCollection/0/number", testModel.getProperty("/d/results/0/C_HUMIDITY"));
				oModel.setProperty("/TileCollection/1/number", testModel.getProperty("/d/results/0/C_TEMPERATURE"));
				oModel.setProperty("/TileCollection/2/number", testModel.getProperty("/d/results/0/C_DISTANCE"));
				oModel.setProperty("/TileCollection/4/number", testModel.getProperty("/d/results/0/C_TILT"));
				});
				testModel.attachRequestFailed(function() {
					console.log(false, "Error handler should not be called when request is aborted via destroy!");
				});
				testModel.loadData("/iotmms/v1/api/http/app.svc/SYSTEM.T_IOT_4AFD1B5B48B759BD3410?$format=json&$top=1&$orderby=G_CREATED%20desc");

<<<<<<< HEAD
=======
				//Fetch the odata model and populate the tiles
				//https://iotmmss0015222403trial.hanatrial.ondemand.com/com.sap.iotservices.mms/v1/api/http/app.svc/SYSTEM.T_IOT_4AFD1B5B48B759BD3410?$format=json&$top=1

				var headers = {};
				headers.Authorization = "Access-Control-Allow-Origin: *.ondemand.com";
				headers.setHeader = "X-Requested-With: JSONHttpRequest";
				headers.setHeader = "Content-type: application/x-www-form-urlencoded";
				
				var oModelTileInput = new sap.ui.model.json.JSONModel();
				oModelTileInput.loadData("/iotmms/v1/api/http/app.svc/SYSTEM.T_IOT_4AFD1B5B48B759BD3410?$format=json&$top=1");
>>>>>>> branch 'master' of https://github.com/RobDemandt/iot-consumption.git

			});

			this.initChart();
			//BH:Not Needed anymore
			// Wait until all promises are resolved and set default selection
			//Models.loadRDMSModels(this._oDeviceModel, this._oDeviceTypesModel, this._oMeasureModel).then(function(mValues) {
			// Get devices
			//	var mDevices = mValues[0];
			//	if (mDevices.length > 0) {
			// Set selection to first device
			//		this.changeDevice(mDevices[0].id);
			//	}
			//}.bind(this));
		},

		/**
		 * Refesh the RDMS models and adapt the selected device, if necessary.
		 */
		onRefreshDevicesPressed: function(evt) {

			var selectedDeviceId = this._oViewModel.getProperty('/selectedDeviceId');
			Models.loadRDMSModels(this._oDeviceModel, this._oDeviceTypesModel, this._oMeasureModel).then(function(mValues) {
				// check, if the selected device is still available
				var mDevices = mValues[0];
				for (var i = 0; i < mDevices.length; i++) {
					if (mDevices[i].id === selectedDeviceId) {
						return;
					}
				}
				// if the device has been deleted, select another device
				if (mDevices.length > 0) {
					// Set selection to first device
					this.changeDevice(mDevices[0].id);
				}
			}.bind(this));
		},

		/**
		 * Eventhandler that is called when the user selects a different device
		 *
		 * @param oEvent
		 */
		onDeviceChange: function(oEvent) {
			var oSelectedItem = oEvent.getParameter("selectedItem");
			var sId = oSelectedItem.getKey();
			// Set selected device
			this.changeDevice(sId);
			// update chart
			this.setChart();
		},

		/**
		 * Eventhandler that is called when the user select a different message type
		 *
		 * @param oEvent
		 */
		onMessageTypeChange: function(oEvent) {
			var oSelectedItem = oEvent.getParameter("selectedItem");
			var sId = oSelectedItem.getKey();
			// Set selected message type
			this._oViewModel.setProperty('/selectedMessageTypeId', sId);

			this.setMeasures(sId);
			this.clearMeasureSelection();

			// update chart
			this.setChart();
		},

		/**
		 * Adapt value state of the measure selection control and redraw the chart according to the selected measures.
		 */
		onMeasureSelectionChanged: function(evt) {
			if (evt.getSource().getSelectedItems().length === 0) {
				evt.getSource().setValueState(sap.ui.core.ValueState.Error);
			} else {
				evt.getSource().setValueState(sap.ui.core.ValueState.None);
			}
			this.setChart();
		},

		/**
		 * Set or clear the automatic chart data update.
		 */
		onAutoRefreshChanged: function(evt) {
			if (this.getView().byId('autoRefreshSwitch').getState()) {
				this.intervalId = setInterval(this.updateChartData.bind(this), this.CHART_UPDATE_INTERVAL);
				this.updateChartData();
			} else {
				if (this.intervalId) {
					clearInterval(this.intervalId);
				}
			}
		},

		/**
		 * Reload chart data to adapt to the chosen number of values to be shown.
		 */
		onShownValueCountChanged: function(evt) {
			this.updateChartData();
		},

		/**
		 * Should be called when the device ID changes
		 *
		 * @param sId the ID of a device
		 */
		changeDevice: function(sId) {
			var oDevice = this.getDeviceById(sId);
			var oDeviceType = this.getDeviceTypeById(oDevice.deviceType);

			this._oViewModel.setProperty('/messageTypes', oDeviceType.messageTypes);
			this._oViewModel.setProperty('/selectedMessageTypeId', oDeviceType.messageTypes[0].id);
			this._oViewModel.setProperty('/selectedDeviceId', oDevice.id);

			this.setMeasures(oDeviceType.messageTypes[0].id);
			this.clearMeasureSelection();
		},

		/**
		 * Clear the selected measures in the measure selection control and set value state to error.
		 */
		clearMeasureSelection: function() {
			var measureSelection = this.getView().byId('measureSelection');
			measureSelection.clearSelection();
			measureSelection.setValueState(sap.ui.core.ValueState.Error);
		},

		/**
		 * Get the deviceType by ID from the deviceType model
		 *
		 * @param sId the id of a device
		 * @returns {DeviceType}
		 */
		getDeviceTypeById: function(sId) {
			var mDeviceTypes = this._oDeviceTypesModel.getData();
			var mFilteredDeviceTypes = mDeviceTypes.filter(function(next) {
				return sId === next.id;
			});
			return mFilteredDeviceTypes[0];
		},

		/**
		 * Get the device by ID from the device model
		 *
		 * @param sId the ID of a device
		 * @returns {Device}
		 */
		getDeviceById: function(sId) {
			var mDevices = this._oDeviceModel.getData();
			var mFilteredDevices = mDevices.filter(function(next) {
				return sId === next.id;
			});
			return mFilteredDevices[0];
		},

		/**
		 * Set all message fields that can be used as measures in the chart.
		 *
		 * @param sMessageType the ID of a MessageType
		 */
		setMeasures: function(sMessageType) {
			var aMessageContent = this._oMeasureModel.getData();
			var oMessage;
			for (var i = 0; i < aMessageContent.length; i++) {
				if (sMessageType === aMessageContent[i].id) {
					oMessage = aMessageContent[i];
					break;
				}
			}
			if (oMessage) {
				// filtering the timestamp field because it will be displayed on the X-Axis
				var fields = oMessage.fields.filter(function(value) {
					return value.name !== "timestamp";
				});
				this._oViewModel.setProperty("/measures", fields);
			}
		},

		/**
		 * Initialize the chart with visualization properties and a dataset containing the timestamp dimension.
		 * The chart is initially set to invisible.
		 */
		initChart: function() {
			var oVizFrame = this.getView().byId('idVizFrame');
			oVizFrame.setVizProperties({
				plotArea: {
					window: {
						start: Date.now(),
						end: Date.now()
					},
					dataLabel: {
						formatString: "__UI5__ShortIntegerMaxFraction2",
						visible: false
					}
				},
				legend: {
					visible: true
				},
				title: {
					visible: false
				},
				timeAxis: {
					title: {
						visible: false
					},
					levels: ["day", "month", "year"],
					levelConfig: {
						month: {
							formatString: "MM"
						},
						year: {
							formatString: "yyyy"
						}
					},
					interval: {
						unit: ''
					}
				},
				valueAxis: {
					title: {
						visible: false
					}
				}
			});
			oVizFrame.setModel(this._oChartModel);

			var oDataset = new sap.viz.ui5.data.FlattenedDataset({
				dimensions: [{
					name: "timestamp",
					value: {
						path: 'G_CREATED',
						formatter: this.formatDate
					},
					dataType: "date"
				}]
			});
			oDataset.bindAggregation("data", {
				path: "/"
			});
			oVizFrame.setDataset(oDataset);
			oVizFrame.setVisible(false);
		},

		/**
		 * Reload chart data. If no measures are selected, the call is ignored.
		 */
		updateChartData: function() {
			
			//Update the tiles
				var testModel = new sap.ui.model.json.JSONModel();
				testModel.attachRequestCompleted(function() {
					console.log('Update of tiles!');

					this.getView().getModel("GlobalTile").setProperty("/TileCollection/0/number", "55");
					this.getView().getModel("GlobalTile").setProperty("/TileCollection/1/number",  55);
					this.getView().getModel("GlobalTile").setProperty("/TileCollection/2/number", testModel.getProperty("/d/results/0/C_DISTANCE"));
					this.getView().getModel("GlobalTile").setProperty("/TileCollection/4/number", testModel.getProperty("/d/results/0/C_TILT"));
					sap.ui.getCore().getModel("GlobalTile").setProperty("/TileCollection/0/number", "55");
					sap.ui.getCore().getModel("GlobalTile").refresh(true);
					this.getView().getModel("GlobalTile").updateBindings();
				});
				testModel.attachRequestFailed(function() {
					console.log(false, "Error handler should not be called when request is aborted via destroy!");
				});
				testModel.loadData("/iotmms/v1/api/http/app.svc/SYSTEM.T_IOT_4AFD1B5B48B759BD3410?$format=json&$top=1&$orderby=G_CREATED%20desc");
			
			// if no measures are selected, skip loading data
			if (this.getView().byId('measureSelection').getSelectedItems().length < 1) {
				return;
			}

			var sDeviceId = this._oViewModel.getProperty('/selectedDeviceId');
			var sMessageTypeId = this._oViewModel.getProperty('/selectedMessageTypeId').toUpperCase();

			var shownValueCount = this._oViewModel.getProperty('/shownValueCount');
			this._oDataModel.read("/T_IOT_" + sMessageTypeId, {
				urlParameters: {
					"$top": shownValueCount
				},
				filters: [
					new sap.ui.model.Filter("G_DEVICE", sap.ui.model.FilterOperator.EQ, sDeviceId)
				],
				sorters: [
					new sap.ui.model.Sorter("G_CREATED", true)
				],
				success: function(oData, oResponse) {
					this._oChartModel.setData(oData.results);
				}.bind(this),
				error: function(oError) {
					this._oChartModel.setData(null);
				}.bind(this)
			});
		},

		/**
		 * Set the chart to the current selected device, message type and selected measure 
		 */
		setChart: function() {
			var oVizFrame = this.getView().byId('idVizFrame');

			var oSelectedItems = this.getView().byId('measureSelection').getSelectedItems();
			if (oSelectedItems.length > 0) {
				oVizFrame.setVisible(true);
				var oDataset = oVizFrame.getDataset();
				var oPlainMeasures = [];
				for (var i in oSelectedItems) {
					oPlainMeasures[i] = oSelectedItems[i].getProperty("text");
					oDataset.addMeasure(new sap.viz.ui5.data.MeasureDefinition({
						name: oPlainMeasures[i],
						value: "{C_".concat(oPlainMeasures[i].toUpperCase(), "}")
					}));
				}

				oVizFrame.removeFeed(1);
				oVizFrame.addFeed(new sap.viz.ui5.controls.common.feeds.FeedItem({
					"uid": "primaryValues",
					"type": "Measure",
					"values": oPlainMeasures
				}));

				this.updateChartData();
			} else {
				oVizFrame.setVisible(false);
				// if no measures are selected, delete the chart data and data bindings
				this._oChartModel.setData(null);
				oVizFrame.removeFeed(1);
				oVizFrame.getDataset().removeAllMeasures();
			}
		},

		/**
		 * Formats the date object that is shown in chart
		 *
		 * @param oValue the value to be date formatted
		 * @returns {string} a date formatted string
		 */
		formatDate: function(oValue) {
			var oDate = null;
			// can be of type Date if consumed with OData (XML format)
			if (oValue instanceof Date) {
				oDate = oValue;
			}
			// can be a string primitive in JSON, but we need a number
			else if ((typeof oValue) === "string") {
				// can be of type JSON Date if consumed with OData (JSON format)
				if (oValue.indexOf("/") === 0) {
					oValue = oValue.replace(new RegExp("/", 'g'), "");
					oValue = oValue.replace(new RegExp("\\(", 'g'), "");
					oValue = oValue.replace(new RegExp("\\)", 'g'), "");
					oValue = oValue.replace("Date", "");
					oValue = parseInt(oValue);
					oDate = new Date(oValue);
				} else {
					// backward compatibility, old type was long, new type is date
					// check if not a number
					var result = isNaN(Number(oValue));
					if (result) {
						// FF and Ie cannot create Dates using 'DD-MM-YYYY HH:MM:SS.ss' format but
						// 'DD-MM-YYYYTHH:MM:SS.ss'
						oValue = oValue.replace(" ", "T");
						// this is a date type
						oDate = new Date(oValue);
					} else {
						// this is a long type
						oValue = parseInt(oValue);
						// ensure that UNIX timestamps are converted to milliseconds
						oDate = new Date(oValue * 1000);
					}
				}
			} else {
				// ensure that UNIX timestamps are converted to milliseconds
				oDate = new Date(oValue * 1000);
			}
			return oDate;
		},

		/**
		 * Formats the enablement of the select fields. If no data is found the select fields are disabled.
		 *
		 * @param oValue the data that is shown in select
		 * @returns {boolean} false if select should be disabled else true
		 */
		formatSelectEnablement: function(oValue) {
			if (oValue === null || oValue === undefined || oValue.length === 0 || jQuery.isEmptyObject(oValue)) {
				return false;
			}
			return true;
		}
	});
});
