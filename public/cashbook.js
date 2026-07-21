/*=========================================
        DAILY CASH BOOK
        PART - 2A
=========================================*/

let openingBalance = 0;
let closingBalance = 0;

let ledger = [];

let editMode = false;
let editId = null;

let isSaving = false;

let customers = [];

let filteredCustomers = [];

let selectedSuggestion = -1;

let selectedCustomer = null;

let customerOpeningBalance = 0;

let cashbookLockId = "";

/*=========================================
        API URL
=========================================*/

//const API = "/cashbook";
const API = "";

async function openCashbook(){

    const oldLockId =
    sessionStorage.getItem(
        "cashbookLockId"
    );

    const response =
    await fetch(

        "/cashbookopen",

        {

            headers:{

                "Cashbook-Lock":

                oldLockId || ""

            }

        }

    );

    const result =
    await response.json();

    if(!result.success){

        alert(result.message);

        window.location.href="/";

        return false;

    }

    cashbookLockId =
    result.lockId;

    sessionStorage.setItem(

        "cashbookLockId",

        cashbookLockId

    );

    return true;

}
async function closeCashbook(){

    try{

        await fetch(

            "/cashbookclose",

            {

                method:"POST",

                headers:{

                    "Cashbook-Lock":

                    cashbookLockId

                }

            }

        );

    }
    catch(ex){

        console.log(ex);

    }

}

function searchCustomer(){

    const txt =
    document
    .getElementById("txtCustomer");

    const text =
    txt.value
    .trim()
    .toLowerCase();

    if(text==""){

        filteredCustomers = [...customers];

        selectedSuggestion = -1;

        showSuggestions();

        return;

    }

    filteredCustomers =
    customers.filter(function(item){

        const eng =
        (item.name || "")
        .toLowerCase();

        const tam =
        item.name_in_tam || "";

        const mobile =
        item.mob_no || "";

        return(

            eng.includes(text.toLowerCase())

            ||

            tam.includes(text)

            ||

            mobile.includes(text)

        );

    });

    selectedSuggestion = -1;

    showSuggestions();

}
function showSuggestions(){

    const div =
    document.getElementById(
        "customerSuggestions"
    );

    div.innerHTML="";

    if(filteredCustomers.length==0){

        hideSuggestions();

        return;

    }

    filteredCustomers.forEach(function(item,index){

        const row =
        document.createElement("div");

        row.className =
        "suggestion-item";

        row.innerHTML =

            item.name + "|" +
            item.name_in_tam +

            " (" +

            item.mob_no +

            ")";

        row.onclick=function(){

            selectCustomer(index);

        };

        div.appendChild(row);

    });

    positionSuggestions();

    div.classList.remove("hidden");

}
function showSuggestions(){

    const div =
    document.getElementById(
        "customerSuggestions"
    );

    div.innerHTML="";

    if(filteredCustomers.length==0){

        hideSuggestions();

        return;

    }

    filteredCustomers.forEach(function(item,index){

        const row =
        document.createElement("div");

        row.className =
        "suggestion-item";

        row.innerHTML =

        "<div><b>" +

        item.name +

        "</b> (" +

        item.mob_no +

        ")</div>" +

        "<div>" +

        item.name_in_tam +

        "</div>";


            

        row.onclick=function(){

            selectCustomer(index);

        };

        div.appendChild(row);

    });

    positionSuggestions();

    div.classList.remove("hidden");

}
function hideSuggestions(){

    document
    .getElementById(
        "customerSuggestions"
    )
    .classList
    .add("hidden");

}
function positionSuggestions(){

    const txt =
    document
    .getElementById(
        "txtCustomer"
    );

    const div =
    document
    .getElementById(
        "customerSuggestions"
    );

    const rect =
    txt.getBoundingClientRect();

    div.style.left =
    rect.left + "px";

    div.style.top =
    (rect.bottom+2)+"px";

    div.style.width =
    rect.width+"px";

}
async function loadCustomerLedger(customerId){

    try{

        const response =
        await fetch("/cashbooklist/" + customerId);

        const result =
        await response.json();

        ledger = result;

        refreshTable();

        calculateSummary();

    }
    catch(ex){

        console.log(ex);

        alert("Unable to load customer ledger.");

    }

}
function selectCustomer(index){

    selectedCustomer =
    filteredCustomers[index];

    document
    .getElementById(
        "txtCustomer"
    )
    .value =
    selectedCustomer.name;

    hideSuggestions();


    loadOpeningBalance(selectedCustomer._id);

    loadLedger(selectedCustomer._id);

}
function customerKeyDown(e){

    if(document
       .getElementById("customerSuggestions")
       .classList.contains("hidden"))
        return;

    if(e.key=="ArrowDown"){

        e.preventDefault();

        if(selectedSuggestion <
           filteredCustomers.length-1){

            selectedSuggestion++;

        }

        highlightSuggestion();

    }

    else if(e.key=="ArrowUp"){

        e.preventDefault();

        if(selectedSuggestion>0){

            selectedSuggestion--;

        }

        highlightSuggestion();

    }

    else if(e.key=="Enter"){

        e.preventDefault();

        if(selectedSuggestion>=0){

            selectCustomer(selectedSuggestion);

        }

    }

    else if(e.key=="Escape"){

        hideSuggestions();

    }

}
function highlightSuggestion(){

    const rows =
    document.querySelectorAll(
        "#customerSuggestions .suggestion-item"
    );

    rows.forEach(function(r){

        r.classList.remove("selected");

    });

    if(selectedSuggestion<0)
        return;

    rows[selectedSuggestion]
        .classList.add("selected");

    rows[selectedSuggestion]
        .scrollIntoView({
            block:"nearest"
        });

}
async function loadCustomers(){

    const response =
    await fetch("/velavan_cust_list");

    customers =
    await response.json();
    

}
async function checkCashbookSession(){

    const response =
    await fetch("/cashbooksession",{

        headers:{

            "Tab-Id" : getTabId()

        }

    });

    const result =
    await response.json();

    if(result.success)
        return true;

    if(result.takenOver){

        const ok =
        confirm(
        "Cashbook is already open on another device.\n\nTake Control?"
        );

        if(!ok){

            window.location.href="/";

            return false;

        }

        await takeControl();

    }

    return true;

}
async function takeControl(){

    const response =
    await fetch("/cashbooktakeover",{

        method:"POST"

    });

    const result =
    await response.json();

    if(!result.success){

        alert("Unable to take control.");

        window.location.href="/";

    }

}
function getTabId(){

    let tabId =
    sessionStorage.getItem("cashbookTabId");

    if(tabId == null){

        tabId = crypto.randomUUID();

        sessionStorage.setItem(
            "cashbookTabId",
            tabId
        );

    }

    return tabId;

}
function startHeartbeat(){

    heartbeatTimer =

    setInterval(

        sendHeartbeat,

        20000

    );

}
async function sendHeartbeat(){

    const response =

    await fetch(

        "/cashbookheartbeat",

        {

            method:"POST",

            headers:{

                "Tab-Id":getTabId()

            }

        }

    );

    const result =

    await response.json();

    if(result.success)
        return;

    clearInterval(

        heartbeatTimer

    );

    alert(

        "Cashbook has been opened on another device."

    );

    window.location.href="/";

}
async function releaseLock(){

    try{

        await fetch("/cashbookrelease",{

            method:"POST",

            headers:{

                "Tab-Id":getTabId()

            }

        });

    }
    catch(ex){

    }

}

/*=========================================
        LOAD PAGE
=========================================*/

window.onload = async function(){

    const ok =
    await openCashbook();

    if(!ok)
        return;

    setToday();

    registerEvents();

    document
    .getElementById("cmbType")
    .value="Payment";

    await loadCustomers();

};






/*=========================================
        TODAY DATE
=========================================*/

function setToday(){

    const d = new Date();

    const yyyy = d.getFullYear();

    const mm = String(d.getMonth()+1).padStart(2,"0");

    const dd = String(d.getDate()).padStart(2,"0");

    document.getElementById("txtDate").value =
    yyyy + "-" + mm + "-" + dd;

}


/*=========================================
        EVENTS
=========================================*/

function registerEvents(){

    document
    .getElementById("txtCustomer")
    .addEventListener(
        "input",
        searchCustomer
    );

    document
    .getElementById("txtCustomer")
    .addEventListener(
        "keydown",
        customerKeyDown
    );

    document
    .getElementById("cmbType")
    .addEventListener(
        "change",
        typeChanged
    );

    document
    .getElementById("txtAmount")
    .addEventListener(
        "input",
        amountChanged
    );

    document
    .getElementById("txtDate")
    .addEventListener(
        "change",
        dateChanged
    );

    document
    .getElementById("btnCancel")
    .addEventListener(
        "click",
        closePopup
    );

    document
    .getElementById("btnSave")
    .addEventListener(
    "click",
    saveEntry
    );
    document
    .getElementById("txtAmount")
    .addEventListener(
    "focus",
    function(){

        this.select();

    });
    document
    .getElementById("txtRemarks")
    .addEventListener(
    "keydown",
    function(e){

        if(e.key=="Enter"){

            e.preventDefault();

            saveEntry();

        }

    });

    document
    .getElementById("editType")
    .addEventListener(
    "change",
    editTypeChanged
    );
    document
    .getElementById("editAmount")
    .addEventListener(
    "input",
    calculateEditClosing
    );
    document
    .getElementById("btnUpdate")
    .addEventListener(
    "click",
    updateEntry
    );
    document
    .getElementById("btnDelete")
    .addEventListener(
    "click",
    deleteEntry
    );
    
    document
    .getElementById("txtCustomer")
    .addEventListener(
        "focus",
        searchCustomer
    );

    document
    .getElementById("txtCustomer")
    .addEventListener(
        "focus",
        function(){

            this.select();

        }
    );
   
    document
    .getElementById("txtCustomer")
    .addEventListener(
        "blur",
        function(){

            setTimeout(function(){

                hideSuggestions();

            }, 150);

        }
    );

}

function validateCustomer(){

    const txt =
    document
    .getElementById("txtCustomer");

    const value =
    txt.value.trim();

    if(value==""){

        selectedCustomer = null;

        return false;

    }

    const customer =
    customers.find(function(item){

        return (
            item.name.toLowerCase() ==
            value.toLowerCase()
        );

    });

    if(customer){

        selectedCustomer = customer;

        return true;

    }

    selectedCustomer = null;

    return false;

}

/*=========================================
        DELETE ENTRY
=========================================*/

async function deleteEntry(){

    if(!confirm("Delete this entry ?"))
        return;

    deleteEntryFromServer();

}
/*=========================================
        DELETE SERVER
=========================================*/

async function deleteEntryFromServer(){

    try{

        const response =
        await fetch("/deletecashbook/" + editId,{

            method:"DELETE",
            headers:{

                "Cashbook-Lock":cashbookLockId

            }

        });

        const result =
        await response.json();

        if(result.success){

            // Remove latest transaction
            ledger.shift();

            if(ledger.length > 0){

                setCurrentBalance(ledger[0].closing);

            }
            else{

                setCurrentBalance(0);

            }

            refreshTable();

            closePopup();

            focusAmount();

        }
        else{

            alert(result.message);

        }

    }
    catch(ex){

        console.log(ex);

        alert("Unable to delete.");

    }

}
/*=========================================
        UPDATE ENTRY
=========================================*/

/*=========================================
        UPDATE ENTRY
=========================================*/

async function updateEntry(){

    const data={

        _id : editId,

        amount : Number(
            document.getElementById("editAmount").value
        ),

        type :
        document.getElementById("editType").value,

        remarks :
        document.getElementById("editRemarks").value.trim()

    };

    if(data.amount<=0){

        alert("Invalid Amount.");

        document
        .getElementById("editAmount")
        .focus();

        return;

    }

    updateEntryToServer(data);

}

/*=========================================
        UPDATE SERVER
=========================================*/

async function updateEntryToServer(data){

    try{

        const response =
        await fetch("/updatecashbook",{

            method:"PUT",

            headers:{
                "Content-Type":"application/json",
                "Cashbook-Lock":cashbookLockId
            },

            body:JSON.stringify(data)

        });

        const result =
        await response.json();

        if(result.success){

            // Latest transaction
            const item = ledger[0];

            item.amount = data.amount;
            item.type = data.type;
            item.remarks = data.remarks;

            if(item.type=="Receipt"){

                item.closing =
                Number(item.opening) +
                Number(item.amount);

            }
            else{

                item.closing =
                Number(item.opening) -
                Number(item.amount);

            }

            setCurrentBalance(item.closing);

            refreshTable();

            closePopup();

            focusAmount();

        }
        else{

            alert(result.message);

        }

    }
    catch(ex){

        console.log(ex);

        alert("Unable to update.");

    }

}
/*=========================================
        EDIT CLOSING
=========================================*/

function calculateEditClosing(){

    let opening =
    Number(
    document
    .getElementById("editOpening")
    .value
    .replace(/,/g,"")
    );

    if(isNaN(opening))
        opening=0;

    let amount =
    Number(
    document
    .getElementById("editAmount")
    .value
    );

    if(isNaN(amount))
        amount=0;

    const type =
    document
    .getElementById("editType")
    .value;

    let closing=0;

    if(type=="Receipt"){

        closing =
        opening + amount;

    }
    else{

        closing =
        opening - amount;

    }

    document
    .getElementById("editClosing")
    .value =
    formatAmount(closing);

}
/*=========================================
        EDIT TYPE
=========================================*/

function editTypeChanged(){

    const type =
    document
    .getElementById("editType")
    .value;

    document
    .getElementById("editAmountLabel")
    .innerHTML =
    type;

    calculateEditClosing();

}
/*=========================================
        LOAD LEDGER
=========================================*/

/*=========================================
        LOAD LEDGER
=========================================*/
/*
async function loadLedger(){

    try{

        const response =
        await fetch("/cashbooklist");

        const result =
        await response.json();

        ledger = result;
        console.log("Ledger Data:", ledger);
        console.log("Rows:", ledger.length);

        refreshTable();

        updateLastEntry();

        calculateOpening();

        updateTodaySummary();

        highlightLastRow();

    }
    catch(ex){

        console.log(ex);

        alert("Unable to load cash book.");

    }

}
*/
function setCurrentBalance(balance){

    openingBalance = Number(balance);
    closingBalance = Number(balance);

    document.getElementById("txtOpening").value =
    formatAmount(openingBalance);

    document.getElementById("txtClosing").value =
    formatAmount(closingBalance);

    document.getElementById("lblCurrentBalance").innerHTML =
    formatAmount(closingBalance);

}
async function loadOpeningBalance(customerId){

    try{

        const response =
        await fetch("/cashbookopening/" + customerId);

        const result =
        await response.json();

       setCurrentBalance(result.opening);

    }
    catch(ex){

        console.log(ex);

        setCurrentBalance(0);

    }

}

async function loadLedger(customerId){

    if(!customerId)
        return;

    const response =
    await fetch("/cashbooklist/" + customerId);

    ledger =
    await response.json();

    refreshTable();

    updateLastEntry();

}

/*=========================================
        REFRESH CUSTOMER LEDGER
=========================================*/

async function refreshCustomer(){

    if(!selectedCustomer)
        return;

    await loadOpeningBalance(selectedCustomer._id);

    await loadLedger(selectedCustomer._id);
    document.getElementById("txtCustomer").value =
    selectedCustomer.name;

    updateSummary();

}
/*=========================================
        LAST ENTRY
=========================================*/

function updateLastEntry(){

    if(ledger.length==0){

        document
        .getElementById("lblLastEntry")
        .innerHTML="-";

        return;

    }

    //const last =
    //ledger[ledger.length-1];
    const last =
    ledger[0];

    document
    .getElementById("lblLastEntry")
    .innerHTML=
    last.entry_date;

}

/*=========================================
        OPENING
=========================================*/

function calculateOpening(){

    if(ledger.length==0){

        openingBalance=0;

    }
    else{
/*
        openingBalance=
        Number(
        ledger[
        ledger.length-1
        ].closing);
*/
        openingBalance = ledger.length > 0
            ? Number(ledger[0].closing)
            : 0;
    }

    calculateClosing();

    updateSummary();

}

/*=========================================
        TYPE CHANGED
=========================================*/

function typeChanged(){

    const type =
    document.getElementById("cmbType").value;

    document
    .getElementById("lblAmount")
    .innerHTML = type;

    calculateClosing();

}


/*=========================================
        AMOUNT
=========================================*/

function amountChanged(){

    let txt =
    document.getElementById("txtAmount");

    txt.value =
    txt.value.replace(/[^0-9.]/g,"");

    calculateClosing();

}


/*=========================================
        DATE CHANGE
=========================================*/

/*=========================================
        DATE VALIDATION
=========================================*/

function dateChanged(){

    if(ledger.length==0)
        return;

    const lastDate =
    ledger[
    ledger.length-1
    ].entry_date;

    const newDate =
    document
    .getElementById("txtDate")
    .value;

    if(newDate < lastDate){

        alert(
        "Date should be " +
        lastDate +
        " or later."
        );

        document
        .getElementById("txtDate")
        .value=
        lastDate;

        return;

    }

}


/*=========================================
        CLOSING
=========================================*/

function calculateClosing(){
   

    let amount =
    document.getElementById("txtAmount").value;

    amount = Number(amount);

    if(isNaN(amount))
        amount = 0;

    const type =
    document.getElementById("cmbType").value;

    if(type=="Receipt"){

        closingBalance =
        openingBalance + amount;

    }
    else{

        closingBalance =
        openingBalance - amount;

    }

    document
    .getElementById("txtOpening")
    .value =
    formatAmount(openingBalance);

    document
    .getElementById("txtClosing")
    .value =
    formatAmount(closingBalance);

}


/*=========================================
        FORMAT
=========================================*/

function formatAmount(value){

    value = Number(value);

    if(isNaN(value))
        value = 0;

    return value.toFixed(2);

}
function formatDate(value){

    const d =
    new Date(value);

    const day =
    String(d.getDate()).padStart(2,"0");

    const month =
    String(d.getMonth()+1).padStart(2,"0");

    const year =
    d.getFullYear();

    return day + "-" + month + "-" + year;

}

/*=========================================
        CLEAR ENTRY
=========================================*/

/*=========================================
        CLEAR ENTRY
=========================================*/

/*=========================================
        CLEAR
=========================================*/

function clearEntry(){

   
    document
    .getElementById("txtAmount")
    .value="";

    document
    .getElementById("txtRemarks")
    .value="";


}

/*=========================================
        FOCUS AMOUNT
=========================================*/

function focusAmount(){

    const txt =
    document.getElementById("txtAmount");

    txt.focus();

    txt.select();

}
/*=========================================
        SUMMARY
=========================================*/

function updateSummary(){

    document
    .getElementById("lblCurrentBalance")
    .innerHTML =
    formatAmount(closingBalance);

}

/*=========================================
        TODAY SUMMARY
=========================================*/

function updateTodaySummary(){

    let balance = 0;

    if(ledger.length > 0){

        balance = Number(ledger[0].closing);

    }

    document
    .getElementById("lblCurrentBalance").innerHTML =
    formatAmount(balance);

}


/*=========================================
        POPUP
=========================================*/

function openPopup(){

    document
    .getElementById("editPopup")
    .style.display="flex";

    document
    .getElementById("editAmount")
    .focus();

    document
    .getElementById("editAmount")
    .select();    

}

function closePopup(){

    document
    .getElementById("editPopup")
    .style.display="none";

}


/*=========================================
        RECALCULATE LEDGER
=========================================*/
/*
function recalculateLedger(){

    if(ledger.length==0)
        return;

    let balance = 0;

    for(let i=ledger.length-1;i>=0;i--){

        ledger[i].opening = balance;

        if(ledger[i].type=="Receipt"){

            balance =
            balance +
            Number(ledger[i].amount);

        }
        else{

            balance =
            balance -
            Number(ledger[i].amount);

        }

        ledger[i].closing = balance;

    }

}
    */
/*=========================================
        KEEP LAST 45 DAYS
=========================================*/

function keepLast45Days(){

    const today = new Date();

    ledger = ledger.filter(function(item){

        const dt = new Date(item.entry_date);

        const diff =
        (today - dt) /
        (1000 * 60 * 60 * 24);

        return diff <= 45;

    });

}
/*=========================================
        REFRESH SCREEN
=========================================*/
/*
function refreshScreen(){

    refreshTable();

    updateLastEntry();

}
    */
/*=========================================
        TABLE
=========================================*/

function refreshTable(){

    const tbody =
    document.getElementById("tbodyLedger");

    tbody.innerHTML="";

    if(ledger.length==0){

        tbody.innerHTML=
        "<tr><td colspan='5' class='center'>No Entries</td></tr>";

        return;

    }

    ledger.forEach(function(item,index){

        const tr =
        document.createElement("tr");

        tr.innerHTML = `


            <td>

            ${formatDate(item.entry_date)}

            </td>
            <td class="timeColumn">

                ${item.entry_time || "-"}

            </td>

            <td class="balance">

            ${formatAmount(item.opening)}

            </td>

            <td class="balance">

            ${item.type=="Payment"
            ?formatAmount(item.amount)
            :"-"}

            </td>

            <td class="balance">

            ${item.type=="Receipt"
            ?formatAmount(item.amount)
            :"-"}

            </td>

            <td class="balance">

            ${formatAmount(item.closing)}

            </td>

            <td>

            ${item.remarks}

            </td>

            `;

        //if(index==ledger.length-1){
        if(index==0){

            tr.ondblclick=function(){

                editLastRow();

            };

        }

        tbody.appendChild(tr);

    });

}

/*=========================================
        LAST ROW
=========================================*/

function highlightLastRow(){

    const rows =
    document.querySelectorAll(
    "#tbodyLedger tr"
    );

    rows.forEach(function(r){

        r.classList.remove("lastRow");

    });

    if(rows.length==0)
        return;

    //rows[
    //rows.length-1
    //].classList.add("lastRow");
    rows[0].classList.add("lastRow");

}


/*=========================================
        LAST ROW
=========================================*/

/*=========================================
        EDIT LAST ROW
=========================================*/

function editLastRow(){

    if(ledger.length==0)
        return;

    //const item =
    //ledger[
    //ledger.length-1
    //];
    const item =
    ledger[0];

    loadEditPopup(item);

}


/*=========================================
        KEYBOARD
=========================================*/

document.addEventListener(
"keydown",
function(e){

    if(e.ctrlKey &&
       e.key.toLowerCase()=="s"){

        e.preventDefault();

        document
        .getElementById("btnSave")
        .click();

    }

});


/*=========================================
        ENTER NEXT CONTROL
=========================================*/

document.addEventListener(
"keypress",
function(e){

    if(isSaving){

        e.preventDefault();

        return;

    }
    if(e.key!="Enter")
        return;

    const list = Array.from(
        document.querySelectorAll(
        "input,select,textarea,button")
    );

    const index =
    list.indexOf(document.activeElement);

    if(index==-1)
        return;

    e.preventDefault();

    if(index<list.length-1){

        list[index+1].focus();

    }

});

/*=========================================
        SAVE ENTRY
        PART 2B-2.1
=========================================*/

async function saveEntry(){

    if(isSaving)
        return;

    isSaving = true;

    try{

        const entryDate =
        document.getElementById("txtDate")
        .value;

        const type =
        document.getElementById("cmbType")
        .value;

        const remarks =
        document.getElementById("txtRemarks")
        .value
        .trim();

        let amount =
        document.getElementById("txtAmount")
        .value
        .trim();

        if(!validateCustomer()){

            alert("Please select a valid customer.");

            document
            .getElementById("txtCustomer")
            .focus();

            return;

        }
        /*-------------------------------
            VALIDATE DATE
        -------------------------------*/

        if(entryDate==""){

            alert("Please select date.");

            document
            .getElementById("txtDate")
            .focus();

            return;

        }


        /*-------------------------------
            VALIDATE AMOUNT
        -------------------------------*/

        if(amount==""){

            alert("Please enter amount.");

            document
            .getElementById("txtAmount")
            .focus();

            return;

        }

        amount = Number(amount);

        if(isNaN(amount)){

            alert("Invalid amount.");

            document
            .getElementById("txtAmount")
            .focus();

            return;

        }

        if(amount<=0){

            alert("Amount should be greater than zero.");

            document
            .getElementById("txtAmount")
            .focus();

            return;

        }


        /*-------------------------------
            BUILD OBJECT
        -------------------------------*/

        const data={

            customer_id :
            selectedCustomer._id,

            customer_name :
            selectedCustomer.name,

            entry_date :
            entryDate,

            opening :
            Number(document.getElementById("txtOpening").value),

            amount :
            amount,

            type :
            type,

            closing :
            Number(document.getElementById("txtClosing").value),

            remarks :
            remarks

        };


        console.log(data);


        /*-------------------------------
            NEXT PART
        -------------------------------*/

        await saveEntryToServer(data);


        }
    finally{

        isSaving = false;

    }

}

/*=========================================
        SAVE TO SERVER
=========================================*/

/*=========================================
        SAVE TO SERVER
        PART 2B-2.2
=========================================*/

/*=========================================
        SAVE TO SERVER
        PART 2B-2.3
=========================================*/

async function saveEntryToServer(data){
    //console.log(cashbookLockId);

    const btn =
    document.getElementById("btnSave");

    btn.disabled = true;

    btn.innerHTML = "Saving...";

    try{

        const response =
        await fetch("/savecashbook",{

            method:"POST",

            headers:{
                "Content-Type":"application/json",
                "Cashbook-Lock":cashbookLockId
            },

            body:JSON.stringify(data)

        });

        const result =
        await response.json();
        //console.log("Result:", result);
        //console.log("Doc:", result.doc);

        if(result.success){

            ledger.unshift(result.doc);

            refreshTable();

            updateLastEntry();

            setCurrentBalance(result.doc.closing);

            clearEntry();

            focusAmount();
            
            // Optional WhatsApp
            //sendWhatsApp("9942953388", result.doc);
/*
            // Refresh the grid
            //refreshTable();
            await refreshCustomer();

            // Optional WhatsApp
            //sendWhatsApp("9942953388", result.doc);

            clearEntry();

            //updateSummary();

            focusAmount();
*/
        }
        else{

            alert(result.message);

        }
 
    }
    catch(ex){

        console.log(ex);

        alert("Unable to save.");

    }

    btn.disabled = false;

    btn.innerHTML = "SAVE";

}

/*=========================================
        LOAD EDIT POPUP
=========================================*/

/*=========================================
        LOAD EDIT POPUP
=========================================*/

function loadEditPopup(item){

    editId = item._id;

    document
    .getElementById("editDate")
    .value =
    item.entry_date;

    document
    .getElementById("editOpening")
    .value =
    formatAmount(item.opening);

    document
    .getElementById("editType")
    .value =
    item.type;

    if(item.type=="Receipt"){

        document
        .getElementById("editAmountLabel")
        .innerHTML="Receipt";

    }
    else{

        document
        .getElementById("editAmountLabel")
        .innerHTML="Payment";

    }

    document
    .getElementById("editAmount")
    .value =
    item.amount;

    document
    .getElementById("editRemarks")
    .value =
    item.remarks;

    calculateEditClosing();

    openPopup();

}

function sendWhatsApp(mobile, data){

    if(!mobile)
        return;

    let msg =
`💰 CASH BOOK

Date : ${data.entry_date}
Time : ${data.entry_time}

Type : ${data.type}
Amount : ₹${formatAmount(data.amount)}

Opening : ₹${formatAmount(data.opening)}
Closing : ₹${formatAmount(data.closing)}

Remarks : ${data.remarks}`;

    const url =
    "https://wa.me/91" +
    mobile +
    "?text=" +
    encodeURIComponent(msg);

    window.open(url, "_blank");

}
window.addEventListener("unload", function(){

    navigator.sendBeacon("/cashbookclose");

});