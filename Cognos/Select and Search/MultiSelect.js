define(function() {
    'use strict';

    class MyDataLoggingControl {
        initialize(oControlHost, fnDoneInitializing) {
            console.log("MyDataLoggingControl - Initializing");
            fnDoneInitializing();
        }

        draw(oControlHost) {
            console.log("MyDataLoggingControl - Drawing");
            // No UI to render.
        }

        setData(oControlHost, oDataStore) {
            console.log("MyDataLoggingControl - Received Data");

            if (!oDataStore) {
                console.warn("MyDataLoggingControl - No data store provided.");
                return;
            }

            const config = oControlHost.configuration;
            if (!config) {
                console.warn("MyDataLoggingControl - No configuration provided.");
                return;
            }

            const valueColumnIndex = config["Value"] - 1;
            const displayColumnIndex = config["Display"] - 1;
            const sortConfigString = config["Sort"];
            const groupColumnIndex = config["Group"] - 1;

            if (isNaN(valueColumnIndex) || isNaN(displayColumnIndex) || isNaN(groupColumnIndex)) {
                console.warn("MyDataLoggingControl - Invalid column configuration. Ensure 'Value Column', 'Display Column', and 'Group Column' are numeric in the configuration.");
                return;
            }

            const columnCount = oDataStore.columnCount;
            if (valueColumnIndex < 0 || valueColumnIndex >= columnCount ||
                displayColumnIndex < 0 || displayColumnIndex >= columnCount ||
                groupColumnIndex < 0 || groupColumnIndex >= columnCount) {
                console.warn("MyDataLoggingControl - Configured column index is out of bounds for the Data Store.");
                return;
            }

            const rowCount = oDataStore.rowCount;

            console.log("MyDataLoggingControl - Initial Data Structure:");
            const dataStructure = [];
            for (let i = 0; i < rowCount; i++) {
                const rowData = {
                    value: oDataStore.getCellValue(i, valueColumnIndex),
                    displayValue: oDataStore.getCellValue(i, displayColumnIndex),
                    groupingValue: oDataStore.getCellValue(i, groupColumnIndex),
                    originalRowIndex: i // Keep track of the original row index if needed
                };
                dataStructure.push(rowData);
            }
            console.log(dataStructure);

            // Implement custom sorting logic
            if (sortConfigString && sortConfigString !== "" && sortConfigString != null && (config["Sort"] - 1) !== valueColumnIndex) {
                console.log("MyDataLoggingControl - Applying custom sort.");
                const sortInstructions = sortConfigString.split(',').map(instruction => {
                    const parts = instruction.split(':');
                    return {
                        columnIndex: parseInt(parts[0]) - 1, // Convert to 0-based index
                        sortOrder: parts[1]?.toLowerCase() === 'desc' ? 'desc' : 'asc',
                        sortType: parts[2]?.toLowerCase() === 'numeric' ? 'numeric' : 'alpha' // Default to alpha
                    };
                });

                for (const sortInfo of sortInstructions) {
                    if (isNaN(sortInfo.columnIndex) || sortInfo.columnIndex < 0 || sortInfo.columnIndex >= columnCount) {
                        console.warn(`MyDataLoggingControl - Invalid sort column index: ${sortInfo.columnIndex + 1}. Skipping this sort instruction.`);
                        continue;
                    }
                }

                dataStructure.sort((a, b) => {
                    for (const sortInfo of sortInstructions) {
                        const columnIndex = sortInfo.columnIndex;
                        const sortOrder = sortInfo.sortOrder;
                        const sortType = sortInfo.sortType;

                        const valueA = oDataStore.getCellValue(a.originalRowIndex, columnIndex);
                        const valueB = oDataStore.getCellValue(b.originalRowIndex, columnIndex);

                        if (sortType === 'numeric') {
                            const numA = Number(valueA);
                            const numB = Number(valueB);

                            if (!isNaN(numA) && !isNaN(numB)) {
                                if (numA < numB) {
                                    return sortOrder === 'asc' ? -1 : 1;
                                }
                                if (numA > numB) {
                                    return sortOrder === 'asc' ? 1 : -1;
                                }
                            } else {
                                // Handle cases where conversion to number fails, default to string comparison or handle as needed
                                console.warn(`MyDataLoggingControl - Non-numeric values encountered during numeric sort in column ${columnIndex + 1}. Falling back to string comparison.`);
                                if (valueA < valueB) {
                                    return sortOrder === 'asc' ? -1 : 1;
                                }
                                if (valueA > valueB) {
                                    return sortOrder === 'asc' ? 1 : -1;
                                }
                            }
                        } else { // Default to alphabetical sort
                            if (valueA < valueB) {
                                return sortOrder === 'asc' ? -1 : 1;
                            }
                            if (valueA > valueB) {
                                return sortOrder === 'asc' ? 1 : -1;
                            }
                        }
                    }
                    return 0; // Values are equal, move to the next sort instruction or keep original order
                });
                console.log("MyDataLoggingControl - Data structure after custom sort:");
                console.log(dataStructure);

            } else {
                console.log("MyDataLoggingControl - No custom sort applied based on configuration.");
            }
        }

        destroy(oControlHost) {
            console.log("MyDataLoggingControl - Destroying");
        }
    }

    return MyDataLoggingControl;
});