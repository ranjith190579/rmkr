/*=========================================
        CUSTOMER MASTER
        PART - 2A
=========================================*/

let customers = [];

let editId = null;

let isSaving = false;
let filteredCustomers = [];
/*=========================================
        KEYBOARD SELECTION
=========================================*/

let selectedCustomerIndex = -1;

/*=========================================
        API
=========================================*/

const API = "";


/*=========================================
        LOAD PAGE
=========================================*/

window.onload = function(){

    registerEvents();

    loadCustomers();
    
    //enableTamilTyping("txtNameTam");

    //enableTamilTyping("editNameTam");
    TamilTyping.attach("txtNameTam");
    TamilTyping.attach("editNameTam");

    document
    .getElementById("txtName")
    .focus();

};



/*=========================================
        EVENTS
=========================================*/

function registerEvents(){

    document
    .getElementById("btnSave")
    .addEventListener(
        "click",
        saveCustomer
    );

    document
    .getElementById("btnCancel")
    .addEventListener(
        "click",
        closePopup
    );

    document
    .getElementById("btnUpdate")
    .addEventListener(
        "click",
        updateCustomer
    );

    document
    .getElementById("btnDelete")
    .addEventListener(
        "click",
        deleteCustomer
    );

    document
    .getElementById("txtMobNo")
    .addEventListener(
        "input",
        onlyMobileNumber
    );

    document
    .getElementById("editMobNo")
    .addEventListener(
        "input",
        onlyEditMobileNumber
    );
    document
    .getElementById("txtSearch")
    .addEventListener(

        "input",

        searchCustomer

    );

}
/*=========================================
        SEARCH CUSTOMER
=========================================*/

function searchCustomer(){

    const text =

    document
    .getElementById("txtSearch")
    .value
    .trim()
    .toLowerCase();

    if(text==""){

        filteredCustomers = [...customers];

        refreshTable();

        return;

    }

    filteredCustomers =

    customers.filter(function(item){

        return (

            item.name
            .toLowerCase()
            .includes(text)

            ||

            item.name_in_tam
            .includes(text)

            ||

            item.mob_no
            .includes(text)

        );

    });

    refreshTable();

}

/*=========================================
        MOBILE NUMBER
=========================================*/

function onlyMobileNumber(){

    const txt =
    document.getElementById("txtMobNo");

    txt.value =
    txt.value.replace(/\D/g,"");

}


/*=========================================
        EDIT MOBILE NUMBER
=========================================*/

function onlyEditMobileNumber(){

    const txt =
    document.getElementById("editMobNo");

    txt.value =
    txt.value.replace(/\D/g,"");

}


/*=========================================
        LOAD CUSTOMER
=========================================*/

async function loadCustomers(){

    try{

        const response =
        await fetch("/velavan_cust_list");

        const result =
        await response.json();

        customers = result;
        filteredCustomers = [...customers];
        refreshTable();

    }
    catch(ex){

        console.log(ex);

        alert("Unable to load customers.");

    }

}


/*=========================================
        TABLE
=========================================*/

function refreshTable(){

    const tbody =
    document.getElementById("tbodyCustomer");

    tbody.innerHTML="";

    if(customers.length==0){

        tbody.innerHTML=
        "<tr><td colspan='3' class='center'>No Records</td></tr>";

        return;

    }

    filteredCustomers.forEach(function(item, index){
        const tr =
        document.createElement("tr");

        tr.innerHTML = `

            <td>

                ${item.name}

            </td>

            <td>

                ${item.name_in_tam}

            </td>

            <td class="center">

                ${item.mob_no}

            </td>

        `;
        tr.dataset.index = index;
        tr.onclick = function(){

            selectedCustomerIndex = index;

            highlightSelectedCustomer();

        };
        tr.ondblclick=function(){

            loadEditPopup(item);

        };

        tbody.appendChild(tr);

    });

}
/*=========================================
        HIGHLIGHT ROW
=========================================*/

function highlightSelectedCustomer(){

    const rows =
    document.querySelectorAll("#tbodyCustomer tr");

    rows.forEach(function(r){

        r.classList.remove("selectedRow");

    });

    if(selectedCustomerIndex<0)
        return;

    if(selectedCustomerIndex>=rows.length)
        return;

    rows[selectedCustomerIndex]
    .classList.add("selectedRow");

    rows[selectedCustomerIndex]
    .scrollIntoView({

        block:"nearest"

    });

}

/*=========================================
        CLEAR
=========================================*/

function clearEntry(){

    document
    .getElementById("txtName")
    .value="";

    document
    .getElementById("txtNameTam")
    .value="";

    document
    .getElementById("txtMobNo")
    .value="";

}


/*=========================================
        FOCUS
=========================================*/

function focusName(){

    const txt =
    document.getElementById("txtName");

    txt.focus();

    txt.select();

}


/*=========================================
        POPUP
=========================================*/

function openPopup(){

    document
    .getElementById("editPopup")
    .style.display="flex";

    document
    .getElementById("editName")
    .focus();

    document
    .getElementById("editName")
    .select();

}


function closePopup(){

    document
    .getElementById("editPopup")
    .style.display="none";

}


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

    const list =
    Array.from(

        document.querySelectorAll(

            "input,button"

        )

    );

    const index =
    list.indexOf(

        document.activeElement

    );

    if(index==-1)
        return;

    e.preventDefault();

    if(index<list.length-1){

        list[index+1].focus();

    }
    else{

        document
        .getElementById("btnSave")
        .click();

    }

});

/*=========================================
        KEYBOARD NAVIGATION
=========================================*/

document.addEventListener(

"keydown",

function(e){

    if(document
       .getElementById("editPopup")
       .style.display=="flex"){

        if(e.key=="Escape"){

            closePopup();

        }

        return;

    }

    if(filteredCustomers.length==0)
        return;

    if(e.key=="ArrowDown"){

        e.preventDefault();

        if(selectedCustomerIndex<
           filteredCustomers.length-1){

            selectedCustomerIndex++;

        }

        highlightSelectedCustomer();

    }

    if(e.key=="ArrowUp"){

        e.preventDefault();

        if(selectedCustomerIndex>0){

            selectedCustomerIndex--;

        }

        highlightSelectedCustomer();

    }

    if(e.key=="Enter"){

        const tag =
        document.activeElement.tagName;

        // If cursor is inside an input, textarea or select,
        // do not open the edit popup.
        if(
            tag=="INPUT" ||
            tag=="TEXTAREA" ||
            tag=="SELECT"
        ){
            return;
        }

        if(selectedCustomerIndex>=0){

            e.preventDefault();

            loadEditPopup(
                filteredCustomers[selectedCustomerIndex]
            );

        }

    }

});
/*=========================================
        SAVE CUSTOMER
        PART 2B-1
=========================================*/

async function saveCustomer(){

    if(isSaving)
        return;

    isSaving = true;

    try{

        const name =
        document
        .getElementById("txtName")
        .value
        .trim();

        const nameTam =
        document
        .getElementById("txtNameTam")
        .value
        .trim();

        const mobNo =
        document
        .getElementById("txtMobNo")
        .value
        .trim();


        /*-------------------------
            VALIDATION
        -------------------------*/

        if(name==""){

            alert("Please enter Name.");

            document
            .getElementById("txtName")
            .focus();

            return;

        }


        if(nameTam==""){

            alert("Please enter Tamil Name.");

            document
            .getElementById("txtNameTam")
            .focus();

            return;

        }


        if(mobNo==""){

            alert("Please enter Mobile No.");

            document
            .getElementById("txtMobNo")
            .focus();

            return;

        }


        if(mobNo.length!=10){

            alert("Mobile Number should be 10 digits.");

            document
            .getElementById("txtMobNo")
            .focus();

            return;

        }


        /*-------------------------
            BUILD OBJECT
        -------------------------*/

        const data={

            name : name,

            name_in_tam : nameTam,

            mob_no : mobNo

        };


        console.log(data);


        /*-------------------------
            NEXT PART
        -------------------------*/

        await saveCustomerToServer(data);

    }
    finally{

        isSaving = false;

    }

}

/*=========================================
        SAVE CUSTOMER TO SERVER
        PART 2B-2
=========================================*/

async function saveCustomerToServer(data){

    const btn =
    document.getElementById("btnSave");

    btn.disabled = true;

    btn.innerHTML = "Saving...";

    try{

        const response =
        await fetch(

            "/saveVelavanCustomer",

            {

                method:"POST",

                headers:{

                    "Content-Type":"application/json"

                },

                body:JSON.stringify(data)

            }

        );

        const result =
        await response.json();

        if(result.success){

            await loadCustomers();

            clearEntry();

            focusName();

        }
        else{

            alert(result.message);

        }

    }
    catch(ex){

        console.log(ex);

        alert("Unable to save customer.");

    }

    btn.disabled = false;

    btn.innerHTML = "SAVE";

}
/*=========================================
        LOAD EDIT POPUP
        PART 2B-3
=========================================*/

function loadEditPopup(item){

    editId = item._id;

    document
    .getElementById("editName")
    .value =
    item.name;

    document
    .getElementById("editNameTam")
    .value =
    item.name_in_tam;

    document
    .getElementById("editMobNo")
    .value =
    item.mob_no;

    openPopup();

}


/*=========================================
        UPDATE CUSTOMER
=========================================*/

async function updateCustomer(){

    const name =
    document
    .getElementById("editName")
    .value
    .trim();

    const nameTam =
    document
    .getElementById("editNameTam")
    .value
    .trim();

    const mobNo =
    document
    .getElementById("editMobNo")
    .value
    .trim();


    if(name==""){

        alert("Please enter Name.");

        document
        .getElementById("editName")
        .focus();

        return;

    }


    if(nameTam==""){

        alert("Please enter Tamil Name.");

        document
        .getElementById("editNameTam")
        .focus();

        return;

    }


    if(mobNo.length!=10){

        alert("Mobile Number should be 10 digits.");

        document
        .getElementById("editMobNo")
        .focus();

        return;

    }


    const data={

        _id : editId,

        name : name,

        name_in_tam : nameTam,

        mob_no : mobNo

    };


    await updateCustomerToServer(data);

}


/*=========================================
        UPDATE SERVER
=========================================*/

async function updateCustomerToServer(data){

    try{

        const response =
        await fetch(

            "/updateVelavanCustomer",

            {

                method:"PUT",

                headers:{

                    "Content-Type":"application/json"

                },

                body:JSON.stringify(data)

            }

        );

        const result =
        await response.json();

        if(result.success){

            closePopup();

            await loadCustomers();

            focusName();

        }
        else{

            alert(result.message);

        }

    }
    catch(ex){

        console.log(ex);

        alert("Unable to update customer.");

    }

}


/*=========================================
        DELETE CUSTOMER
=========================================*/

async function deleteCustomer(){

    if(!confirm("Delete this customer ?"))
        return;

    await deleteCustomerFromServer();

}


/*=========================================
        DELETE SERVER
=========================================*/

async function deleteCustomerFromServer(){

    try{

        const response =
        await fetch(

            "/deleteVelavanCustomer/" + editId,

            {

                method:"DELETE"

            }

        );

        const result =
        await response.json();

        if(result.success){

            closePopup();

            await loadCustomers();

            focusName();

        }
        else{

            alert(result.message);

        }

    }
    catch(ex){

        console.log(ex);

        alert("Unable to delete customer.");

    }

}