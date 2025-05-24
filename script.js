console.log("Running...");
const serverForReq = "https://meter-reading.up.railway.app/";
// const serverForReq = "http://localhost:8000/";
let activeMeter = 0;
let meterNames = [];
let meterData = [];
let meterFullData = [];

main();
function loader(display) {
  if (display == "none") {
    screenn.style.display = "none";
  } else {
    screenn.style.display = "block";
  }
}
async function main() {
  try {
    const meterUnitsInput = document.querySelector("#meterUnitsInput");
    const navUl = document.querySelector("#navUl");

    // Note updated: expecting an object with meters and readings.
    const dbData = await tookMeterDataToDb();
    meterData = dbData.meters;
    meterFullData = dbData.readings;
    console.log("Fetched Meter Data:", meterData);

    if (!meterData || meterData.length === 0) {
      console.warn("No meter data found, displaying data entry form.");
      document.querySelector("#meterDataEnterWindow").style.display = "flex";
      // Do not return to ensure submit event listeners are attached.
    } else {
      updateNavbar();
      await updateMeterName(activeMeter);
      await addData(activeMeter);
    }

    // Always attach event listeners so you can add a new meter even if DB is empty
    meterUnitsInput.addEventListener("input", async (e) => {
      if (
        e.target.value.length >= meterData[activeMeter][1].toString().length
      ) {
        await loader();
        let enteredValue = parseInt(e.target.value, 10);
        let baselineValue = parseInt(meterData[activeMeter][1], 10); // use initial reading as baseline

        // Check if the entered value is greater than the baseline reading
        if (enteredValue <= baselineValue) {
          console.error(
            "Entered value must be greater than the baseline reading."
          );
          return;
        }

        let pricePerUnit = parseInt(meterData[activeMeter][2], 10);
        let unitsUsed = enteredValue - baselineValue;
        let totalCost = pricePerUnit * unitsUsed;

        // Prepare the new reading data
        const newReading = [
          getCurrentDate(),
          `${baselineValue}-${enteredValue}=${unitsUsed}`,
          `${pricePerUnit}*${unitsUsed}=${totalCost}`,
        ];

        // Ensure the readings array exists for activeMeter
        if (!meterFullData[activeMeter]) {
          meterFullData[activeMeter] = [];
        }
        meterFullData[activeMeter].push(newReading);

        // Remove the line updating the baseline value
        // meterData[activeMeter][1] = enteredValue;

        // Update meter basic data (if needed) in DB without changing baseline reading
        await updateMeterDataInDb(activeMeter, meterData[activeMeter]);
        await updateMeterReadingInDb(activeMeter, newReading);

        // Refresh displayed total units using the latest reading
        await updateMeterName(activeMeter);
        addData(activeMeter);
        document.querySelector("#meterUnitsInput").value = "";
        await loader("none");
      }
    });

    document.querySelector("#submitBtn").addEventListener("click", async () => {
      console.log("Submit Clicked");
      let meterNameInput = document.querySelector("#meterNameInput");
      let meterUnitInput = document.querySelector("#meterUnitInput");
      let meterPriceInput = document.querySelector("#meterPriceInput");

      if (
        meterNameInput.value &&
        meterUnitInput.value &&
        meterPriceInput.value
      ) {
        let newMeter = [
          meterNameInput.value,
          meterUnitInput.value,
          meterPriceInput.value,
        ];
        await loader();
        // Call the new endpoint to append the new meter
        try {
          let req = await fetch(serverForReq + "appendMeter", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ newMeter }),
          });
          if (!req.ok) {
            throw new Error(`HTTP error! status: ${req.status}`);
          }
          let data = await req.json();
          console.log("New meter appended successfully", data);
          // Update local arrays by appending new meter and an empty readings array.
          meterData.push(newMeter);
          meterFullData.push([]);
          updateNavbar();
          await updateMeterName(activeMeter);
          document.querySelector("#meterDataEnterWindow").style.display =
            "none";
        } catch (error) {
          console.error("Error appending new meter:", error);
        }
        await loader("none");
      }
    });

    document.querySelector("#meterDataCross").addEventListener("click", () => {
      document.querySelector("#meterDataEnterWindow").style.display = "none";
    });
  } catch (error) {
    console.error("Error in main function:", error);
  }
}

function getCurrentDate() {
  let date = new Date();
  let day = String(date.getDate()).padStart(2, "0");
  let month = String(date.getMonth() + 1).padStart(2, "0");
  let year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

async function addMeterDataToDb(meterData) {
  try {
    let req = await fetch(serverForReq + "meterDataToDb", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(meterData),
    });

    if (!req.ok) {
      throw new Error(`HTTP error! status: ${req.status}`);
    }

    let data = await req.json();
    console.log("Data added to DB successfully", data);
  } catch (error) {
    console.error("Error adding data to DB:", error);
  }
}

async function tookMeterDataToDb() {
  try {
    console.log("Fetching meter data from DB...");
    // loader("block");
    await loader();
    let getData = await fetch(`${serverForReq}meterDataToDb`);
    if (!getData.ok) {
      throw new Error(`HTTP error! status: ${getData.status}`);
    }

    loader("none");
    console.log("Fetched meter data from DB successfully");

    let data = await getData.json();
    console.log("Raw Fetched Data:", data);

    if (!data || !data.meters || data.meters.length === 0) {
      console.warn("No meter data found, displaying data entry form.");
      document.querySelector("#meterDataEnterWindow").style.display = "flex";
      return { meters: [], readings: [] };
    }

    return data;
  } catch (error) {
    console.error("Error fetching meter data:", error);
    return { meters: [], readings: [] };
  }
}

function updateNavbar() {
  console.log("Updating Navbar...");
  const navUl = document.querySelector("#navUl");
  if (!navUl) return;

  navUl.innerHTML = "";
  meterNames = meterData.map((meter) => meter[0]);

  if (meterNames.length === 0) {
    console.error("No meter names found!");
    return;
  }

  meterNames.forEach((name, index) => {
    let li = document.createElement("li");
    li.innerHTML = name;
    li.setAttribute("data-index", index);
    li.classList.add(
      "w-content-container",
      "flex",
      "justify-center",
      "items-center",

      "p-4",
      "text-xl",
      "text-center",
      "transition",
      "border",
      "border-gray-400",
      "rounded-sm",
      "cursor-pointer",
      "text-purple-50",
      "hover:bg-[#ffffff10]"
    );

    li.addEventListener("click", (e) => {
      activeMeter = parseInt(e.target.getAttribute("data-index"), 10);
      updateMeterName(activeMeter);
    });

    navUl.appendChild(li);
  });

  console.log("Navbar updated:", navUl.innerHTML);
}

async function updateMeterName(activeMeter) {
  try {
    let meterNameSpan = document.querySelector("#meterName span");
    let totalUnits = document.querySelector("#totalUnits span");
    let meterUnitsInput = document.querySelector("#meterUnitsInput");

    meterNames = meterData.map((meter) => meter[0]);
    meterNameSpan.innerHTML = meterNames[activeMeter];

    // If readings exist, display the used units from only the last reading
    if (meterFullData[activeMeter] && meterFullData[activeMeter].length > 0) {
      let lastReading =
        meterFullData[activeMeter][meterFullData[activeMeter].length - 1];
      // Expected format "initial-current=used"
      let parts = lastReading[1].split("=");
      totalUnits.innerHTML =
        parts.length === 2 ? parseInt(parts[1], 10) : meterData[activeMeter][1];
    } else {
      totalUnits.innerHTML = meterData[activeMeter][1];
    }

    meterUnitsInput.placeholder = `Enter ${meterNames[activeMeter]} Meter Units`;

    addData(activeMeter);
  } catch (error) {
    console.error("Error updating meter name:", error);
  }
}

function addData(activeMeter) {
  let mainMeterData = document.querySelector("#mainMeterData");
  mainMeterData.innerHTML = "";

  if (!meterFullData[activeMeter]) return;

  meterFullData[activeMeter].forEach((entry, readingIndex) => {
    let div = document.createElement("div");
    div.className =
      "flex items-center justify-center rounded-sm w-[95%] md:w-[70%] mx-auto border";

    div.innerHTML = `
      <div class="flex flex-col items-center justify-between w-full h-full text-xl border">
        <div><span class="font-semibold">Date:</span> <span>${entry[0]}</span></div>
        <div><span class="font-semibold">Units:</span> <span>${entry[1]}</span></div>
        <div><span class="font-semibold">Price:</span> <span>${entry[2]}</span></div>
      </div>
      <div class="flex items-center justify-center h-full w-[40%]"> 
        <lord-icon
          src="https://cdn.lordicon.com/skkahier.json"
          trigger="hover"
          colors="primary:#fff" 
          alt="delete"
          class="cursor-pointer deleteBtns"
          style="width: 50px; height: 50px"
        ></lord-icon>
      </div>`;

    // Add delete event listener
    div.querySelector(".deleteBtns").addEventListener("click", async () => {
      await deleteMeterReading(activeMeter, readingIndex);
      // Remove the reading from local state and update UI
      meterFullData[activeMeter].splice(readingIndex, 1);
      addData(activeMeter);
    });

    mainMeterData.appendChild(div);
  });
}

async function deleteMeterReading(meterIndex, readingIndex) {
  try {
    let req = await fetch(serverForReq + "deleteMeterReading", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ meterIndex, readingIndex }),
    });
    if (!req.ok) {
      throw new Error(`HTTP error! status: ${req.status}`);
    }
    let response = await req.json();
    console.log("Meter reading deleted successfully", response);
  } catch (error) {
    console.error("Error deleting meter reading:", error);
  }
}

async function updateMeterDataInDb(index, data) {
  try {
    let req = await fetch(serverForReq + "updateMeterData", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ index, data }),
    });

    if (!req.ok) {
      throw new Error(`HTTP error! status: ${req.status}`);
    }

    let response = await req.json();
    console.log("Data updated in DB successfully", response);
  } catch (error) {
    console.error("Error updating data in DB:", error);
  }
}

// New helper function to call /updateMeterReading
async function updateMeterReadingInDb(index, reading) {
  try {
    let req = await fetch(serverForReq + "updateMeterReading", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ index, reading }),
    });

    if (!req.ok) {
      throw new Error(`HTTP error! status: ${req.status}`);
    }

    let response = await req.json();
    console.log("Meter reading updated in DB successfully", response);
  } catch (error) {
    console.error("Error updating meter reading in DB:", error);
  }
}
menuIcon.addEventListener("click", (e) => {
  toggleOptionsWindow(e);
});
function toggleOptionsWindow(e) {
  let menuIcon = document.getElementById("menuIcon");
  let optionsWindow = document.getElementById("optionsWindow");

  if (!e) e = { target: menuIcon }; // Default to menuIcon if no event

  if (e.target.classList.contains("fa-bars")) {
    e.target.classList.remove("fa-bars");
    e.target.classList.add("fa-close");
    optionsWindow.style.display = "block";
  } else {
    e.target.classList.add("fa-bars");
    e.target.classList.remove("fa-close");
    optionsWindow.style.display = "none";
  }
}

document.getElementById("addMeterBtn").addEventListener("click", (e) => {
  toggleOptionsWindow({ target: document.getElementById("menuIcon") });
  meterDataEnterWindow.style.display = "flex";
});

// New event listeners for Edit and Delete buttons from the menu
document.getElementById("editMeterBtn").addEventListener("click", () => {
  toggleOptionsWindow({ target: document.getElementById("menuIcon") });
  showMeterEditModal();
});

document.getElementById("deleteMeterBtn").addEventListener("click", () => {
  toggleOptionsWindow({ target: document.getElementById("menuIcon") });
  showMeterDeleteModal();
});

// Show edit modal and populate list of meters
function showMeterEditModal() {
  const modal = document.getElementById("meterEditModal");
  const list = document.getElementById("editMeterList");
  list.innerHTML = "";
  meterData.forEach((meter, index) => {
    const li = document.createElement("li");
    li.textContent = meter[0];
    li.className = "p-2 border-b cursor-pointer";
    li.addEventListener("click", () => {
      // Show form pre-filled with meter details
      document.getElementById("meterEditForm").classList.remove("hidden");
      document.getElementById("editMeterName").value = meter[0];
      document.getElementById("editMeterUnit").value = meter[1];
      document.getElementById("editMeterPrice").value = meter[2];
      // Attach save event for this meter index
      document.getElementById("saveEditBtn").onclick = async () => {
        await loader();
        const newMeter = [
          document.getElementById("editMeterName").value,
          document.getElementById("editMeterUnit").value,
          document.getElementById("editMeterPrice").value,
        ];
        await updateMeter(index, newMeter);
        meterData[index] = newMeter;
        updateNavbar();
        await updateMeterName(activeMeter);
        modal.classList.add("hidden");
        await loader("none");
      };
    });
    list.appendChild(li);
  });
  modal.classList.remove("hidden");
}

// Show delete modal and populate list of meters
function showMeterDeleteModal() {
  const modal = document.getElementById("meterDeleteModal");
  const list = document.getElementById("deleteMeterList");
  list.innerHTML = "";
  meterData.forEach((meter, index) => {
    const li = document.createElement("li");
    li.textContent = meter[0];
    li.className = "p-2 border-b cursor-pointer";
    li.addEventListener("click", async () => {
      if (confirm(`Delete meter "${meter[0]}" and all its data?`)) {
        if (confirm(`We are confirming again that you sure to delete it?`)) {
          await loader();
          await deleteMeter(index);
          meterData.splice(index, 1);
          meterFullData.splice(index, 1);
          updateNavbar();
          if (activeMeter >= meterData.length)
            activeMeter = meterData.length - 1;
          await updateMeterName(activeMeter);
          modal.classList.add("hidden");
          await loader("none");
        }
      }
    });
    list.appendChild(li);
  });
  modal.classList.remove("hidden");
}

// New helper function: Update meter (basic data) in DB
async function updateMeter(index, newMeter) {
  try {
    let req = await fetch(serverForReq + "updateMeter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ index, newMeter }),
    });
    if (!req.ok) throw new Error(`HTTP error! status: ${req.status}`);
    let response = await req.json();
    console.log("Meter updated successfully", response);
  } catch (error) {
    console.error("Error updating meter:", error);
  }
}

// New helper function: Delete meter (including its readings) from DB
async function deleteMeter(index) {
  try {
    let req = await fetch(serverForReq + "deleteMeter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ meterIndex: index }),
    });
    if (!req.ok) throw new Error(`HTTP error! status: ${req.status}`);
    let response = await req.json();
    console.log("Meter deleted successfully", response);
  } catch (error) {
    console.error("Error deleting meter:", error);
  }
}

// Close modals
document.getElementById("closeEditModal").addEventListener("click", () => {
  document.getElementById("meterEditModal").classList.add("hidden");
});

document.getElementById("closeDeleteModal").addEventListener("click", () => {
  document.getElementById("meterDeleteModal").classList.add("hidden");
});
