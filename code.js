/**
 * Google Apps Script for Lalbaba Engineering Ltd Maintenance Job Handling System
 * 
 * INSTRUCTIONS:
 * 1. Go to Google Sheets (https://sheets.google.com) and create a new Spreadsheet.
 * 2. In the Google Sheet menu, click Extensions -> Apps Script.
 * 3. Delete any code in the editor, and paste this entire code.js file.
 * 4. Click Save (Disk Icon).
 * 5. Click "Deploy" -> "New Deployment".
 * 6. Click the cog icon (Select Type) and choose "Web App".
 * 7. Set configuration:
 *    - Description: Lalbaba Work Report Backend
 *    - Execute as: Me (your-email@gmail.com)
 *    - Who has access: Anyone (This is critical so the web app can communicate with it!)
 * 8. Click "Deploy". Grant permissions if prompted (Go to Advanced -> Go to Untitled project (unsafe)).
 * 9. Copy the "Web App URL" (e.g. https://script.google.com/macros/s/.../exec) and paste it inside the "Settings" tab of our application.
 */

// Handle GET requests (Pulling data from Sheets to App)
function doGet(e) {
  var action = e.parameter.action;
  
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    // Initialize sheets if they don't exist
    initializeSheets(ss);
    
    if (action === "pull") {
      var data = pullAllData(ss);
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        data: data
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: "Unknown action. Use action=pull"
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// Handle POST requests (Pushing data from App to Sheets & Image Upload)
function doPost(e) {
  try {
    var postData = JSON.parse(e.postData.contents);
    var action = postData.action;
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    initializeSheets(ss);
    
    if (action === "push") {
      var success = pushAllData(ss, postData.data);
      return ContentService.createTextOutput(JSON.stringify({
        success: success,
        message: "Data successfully synced to Google Sheets!"
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    if (action === "uploadImage") {
      var base64Data = postData.base64;
      var fileName = postData.fileName || "lalbaba_image_" + new Date().getTime() + ".jpg";
      var imageUrl = uploadImageToDrive(base64Data, fileName);
      
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        url: imageUrl
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: "Unknown action. Use action=push or uploadImage"
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// Ensure sheets exist with correct columns
function initializeSheets(ss) {
  // 1. All Plan Work sheet
  var planSheet = ss.getSheetByName("All Plan Work");
  if (!planSheet) {
    planSheet = ss.insertSheet("All Plan Work");
    var headers = [
      "ID", "Plan Category", "Plan Date", "Location", "Machine Name", 
      "Equipment", "Task Details", "Required Spare Parts", "Work Status", 
      "Planned Responsibilities", "Work Note", "Images", "Date Note", "Done Date"
    ];
    planSheet.appendRow(headers);
    planSheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#e2e8f0");
  }
  
  // 2. Extra Work sheet
  var extraSheet = ss.getSheetByName("Extra Work");
  if (!extraSheet) {
    extraSheet = ss.insertSheet("Extra Work");
    var headers = [
      "ID", "Date", "Machine Name", "Task Details", "Engineer", 
      "Status", "Work Note", "Date Note", "Done Date"
    ];
    extraSheet.appendRow(headers);
    extraSheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#e2e8f0");
  }
  
  // 3. Settings sheet
  var settingsSheet = ss.getSheetByName("Setting");
  if (!settingsSheet) {
    settingsSheet = ss.insertSheet("Setting");
    var headers = [
      "BOM Location", "BOM Machine Name", "BOM Equipments", "Engineers", "Workers"
    ];
    settingsSheet.appendRow(headers);
    settingsSheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#e2e8f0");
  }
}

// Pull all data from sheets
function pullAllData(ss) {
  // Load Settings
  var settingsSheet = ss.getSheetByName("Setting");
  var settingsRows = settingsSheet.getDataRange().getValues();
  var bomList = [];
  var engineersSet = new Set();
  var workersSet = new Set();
  
  for (var i = 1; i < settingsRows.length; i++) {
    var row = settingsRows[i];
    if (row[0] && row[1]) {
      bomList.push({
        location: row[0].toString(),
        machineName: row[1].toString(),
        equipments: row[2] ? row[2].toString().split(",").map(function(s) { return s.trim(); }) : []
      });
    }
    if (row[3]) engineersSet.add(row[3].toString());
    if (row[4]) workersSet.add(row[4].toString());
  }
  
  // Load All Plan Work
  var planSheet = ss.getSheetByName("All Plan Work");
  var planRows = planSheet.getDataRange().getValues();
  var planWorkList = [];
  for (var i = 1; i < planRows.length; i++) {
    var row = planRows[i];
    if (row[0]) {
      planWorkList.push({
        id: row[0].toString(),
        planCatagory: row[1].toString() === "Shutdown" ? "Shutdown" : "daily",
        planDate: formatDate(row[2]),
        location: row[3].toString(),
        machineName: row[4].toString(),
        equipment: row[5].toString(),
        taskDetails: row[6].toString(),
        requiredSpareParts: row[7].toString(),
        workStatus: row[8].toString(),
        plannedResponsibilities: row[9] ? row[9].toString().split(",").map(function(s) { return s.trim(); }) : [],
        workNote: row[10].toString(),
        images: row[11] ? row[11].toString().split(",").map(function(s) { return s.trim(); }) : [],
        dateNote: row[12].toString(),
        doneDate: formatDate(row[13])
      });
    }
  }
  
  // Load Extra Work
  var extraSheet = ss.getSheetByName("Extra Work");
  var extraRows = extraSheet.getDataRange().getValues();
  var extraWorkList = [];
  for (var i = 1; i < extraRows.length; i++) {
    var row = extraRows[i];
    if (row[0]) {
      extraWorkList.push({
        id: row[0].toString(),
        date: formatDate(row[1]),
        machineName: row[2].toString(),
        taskDetails: row[3].toString(),
        engineer: row[4].toString(),
        status: row[5].toString(),
        workNote: row[6].toString(),
        dateNote: row[7].toString(),
        doneDate: formatDate(row[8])
      });
    }
  }
  
  return {
    settings: {
      bom: bomList,
      engineers: Array.from(engineersSet),
      workers: Array.from(workersSet)
    },
    planWork: planWorkList,
    extraWork: extraWorkList
  };
}

// Push all data from App to Sheets (Overwrite everything cleanly)
function pushAllData(ss, data) {
  if (!data) return false;
  
  // 1. Write Settings
  var settingsSheet = ss.getSheetByName("Setting");
  settingsSheet.clearContents();
  var settingsHeaders = ["BOM Location", "BOM Machine Name", "BOM Equipments", "Engineers", "Workers"];
  settingsSheet.appendRow(settingsHeaders);
  settingsSheet.getRange(1, 1, 1, settingsHeaders.length).setFontWeight("bold").setBackground("#e2e8f0");
  
  var bom = data.settings.bom || [];
  var engineers = data.settings.engineers || [];
  var workers = data.settings.workers || [];
  var maxRows = Math.max(bom.length, engineers.length, workers.length);
  
  for (var i = 0; i < maxRows; i++) {
    var row = ["", "", "", "", ""];
    if (bom[i]) {
      row[0] = bom[i].location;
      row[1] = bom[i].machineName;
      row[2] = bom[i].equipments.join(", ");
    }
    if (engineers[i]) row[3] = engineers[i];
    if (workers[i]) row[4] = workers[i];
    settingsSheet.appendRow(row);
  }
  
  // 2. Write Plan Work
  var planSheet = ss.getSheetByName("All Plan Work");
  planSheet.clearContents();
  var planHeaders = [
    "ID", "Plan Category", "Plan Date", "Location", "Machine Name", 
    "Equipment", "Task Details", "Required Spare Parts", "Work Status", 
    "Planned Responsibilities", "Work Note", "Images", "Date Note", "Done Date"
  ];
  planSheet.appendRow(planHeaders);
  planSheet.getRange(1, 1, 1, planHeaders.length).setFontWeight("bold").setBackground("#e2e8f0");
  
  var planWork = data.planWork || [];
  for (var i = 0; i < planWork.length; i++) {
    var job = planWork[i];
    planSheet.appendRow([
      job.id,
      job.planCatagory,
      job.planDate,
      job.location,
      job.machineName,
      job.equipment,
      job.taskDetails,
      job.requiredSpareParts,
      job.workStatus,
      job.plannedResponsibilities.join(", "),
      job.workNote,
      job.images.join(", "),
      job.dateNote,
      job.doneDate
    ]);
  }
  
  // 3. Write Extra Work
  var extraSheet = ss.getSheetByName("Extra Work");
  extraSheet.clearContents();
  var extraHeaders = [
    "ID", "Date", "Machine Name", "Task Details", "Engineer", 
    "Status", "Work Note", "Date Note", "Done Date"
  ];
  extraSheet.appendRow(extraHeaders);
  extraSheet.getRange(1, 1, 1, extraHeaders.length).setFontWeight("bold").setBackground("#e2e8f0");
  
  var extraWork = data.extraWork || [];
  for (var i = 0; i < extraWork.length; i++) {
    var job = extraWork[i];
    extraSheet.appendRow([
      job.id,
      job.date,
      job.machineName,
      job.taskDetails,
      job.engineer,
      job.status,
      job.workNote,
      job.dateNote,
      job.doneDate
    ]);
  }
  
  return true;
}

// Upload base64 image to Google Drive folder
function uploadImageToDrive(base64Str, fileName) {
  // Strip content-type header if present (e.g. data:image/jpeg;base64,...)
  var cleanBase64 = base64Str;
  if (base64Str.indexOf(",") > -1) {
    cleanBase64 = base64Str.split(",")[1];
  }
  
  var decoded = Utilities.base64Decode(cleanBase64);
  var blob = Utilities.newBlob(decoded, "image/jpeg", fileName);
  
  // Find or create "Lalbaba Maintenance Images" folder in Drive
  var folders = DriveApp.getFoldersByName("Lalbaba Maintenance Images");
  var folder;
  if (folders.hasNext()) {
    folder = folders.next();
  } else {
    folder = DriveApp.createFolder("Lalbaba Maintenance Images");
  }
  
  var file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  
  return file.getUrl();
}

// Helper to format Date objects to YYYY-MM-DD
function formatDate(dateVal) {
  if (!dateVal) return "";
  if (dateVal instanceof Date) {
    var year = dateVal.getFullYear();
    var month = ("0" + (dateVal.getMonth() + 1)).slice(-2);
    var day = ("0" + dateVal.getDate()).slice(-2);
    return year + "-" + month + "-" + day;
  }
  return dateVal.toString();
}
