/******************************** 
  GLOBAL STATE
*********************************/
let manualOK = false;
let faceOK = false;
let temp = {};
const role = localStorage.getItem("role") || "student";

/********************************
  LOGIN
*********************************/
function login() {
  const username = document.getElementById("user").value.trim();
  const password = document.getElementById("pass").value.trim();
  const roleSel = document.getElementById("role").value;

  if (roleSel === "admin" && username === "admin" && password === "admin123") {
    localStorage.setItem("role", "admin");
    location.href = "admin.html";
  } 
  else if (roleSel === "student" && password === "1234") {
    localStorage.setItem("role", "student");
    localStorage.setItem("studentId", username);
    location.href = "student.html";
  } 
  else {
    alert("❌ Invalid login credentials");
  }
}

/********************************
  ROLE BASED UI
*********************************/
document.addEventListener("DOMContentLoaded", () => {
  if (role === "student") {
    document.querySelectorAll(".admin-only").forEach(el => el.style.display = "none");
  }

  loadAttendanceTable();
  calculateOverallAttendance();
  loadAnalytics();
  renderCharts();
  initCamera();
  loadDefaulters();

});

/********************************
  THEME
*********************************/
function toggleTheme() {
  document.body.classList.toggle("dark");
  document.body.classList.toggle("light");
}

/********************************
  STEP 1 – MANUAL
*********************************/
function manualStep() {
  const name = document.getElementById('stuName').value;
  const roll = document.getElementById('stuRoll').value;
  const stream = document.getElementById('stuStream').value;
  const subject = document.getElementById('stuSubject').value;

  if (!name || !roll || !stream || !subject) {
    return alert("Fill all fields");
  }

  temp = { name, roll, stream, subject };
  manualOK = true;

  document.getElementById("progress").style.width = "50%";
  document.getElementById("msg").innerText = "✅ Manual Verified";
}

/********************************
  STEP 2 – FACE
*********************************/
function faceStep() {
  if (!manualOK) {
    return alert("Complete manual verification first");
  }

  faceOK = true;
  document.getElementById("progress").style.width = "100%";

  finalizeAttendance();
}

/********************************
  FINAL SAVE (WITH DATE & TIME)
*********************************/
function finalizeAttendance() {
  if (!(manualOK && faceOK)) return;

  const attendance = JSON.parse(localStorage.getItem("attendance")) || [];
  const now = new Date();

  const record = {
    ...temp,
    date: now.toLocaleDateString(),
    time: now.toLocaleTimeString(),
    status: "Present"
  };

  if (attendance.some(a =>
    a.roll === record.roll &&
    a.subject === record.subject &&
    a.date === record.date
  )) {
    alert("Already marked today");
    return;
  }

  attendance.push(record);
  localStorage.setItem("attendance", JSON.stringify(attendance));

  msg.innerText = "✅ Attendance marked successfully";
  manualOK = faceOK = false;
}

/********************************
  LOAD ATTENDANCE TABLE
*********************************/
function loadAttendanceTable() {
  const tbody = document.getElementById("attendanceTable");
  if (!tbody) return;

  const data = JSON.parse(localStorage.getItem("attendance")) || [];
  tbody.innerHTML = "";

  data.forEach(r => {
    tbody.innerHTML += `
      <tr>
        <td>${r.roll}</td>
        <td>${r.name}</td>
        <td>${r.subject}</td>
        <td>${r.date}</td>
        <td>${r.time}</td>
        <td>${r.status}</td>
      </tr>`;
  });
}
app.delete('/reset', auth, async (req, res) => {
  try {
    await Attendance.destroy({ where: {} }); // delete all records
    res.json({ msg: 'All attendance data deleted' });
  } catch (err) {
    res.status(500).json({ msg: 'Reset failed' });
  }
});


/********************************
  OVERALL ATTENDANCE %
*********************************/
function calculateOverallAttendance() {
  const badge = document.getElementById("percent");
  if (!badge) return;

  const data = JSON.parse(localStorage.getItem("attendance")) || [];
  if (data.length === 0) return;

  const present = data.filter(r => r.status === "Present").length;
  const percent = Math.round((present / data.length) * 100);

  badge.innerText = percent + "%";
  badge.className =
    percent < 75 ? "badge bg-danger p-3 fs-4" :
    percent < 85 ? "badge bg-warning p-3 fs-4" :
                   "badge bg-success p-3 fs-4";
}

/********************************
  ANALYTICS COUNTS
*********************************/
function loadAnalytics() {
  const data = JSON.parse(localStorage.getItem("attendance")) || [];

  const present = data.filter(d => d.status === "Present").length;
  const total = new Set(data.map(d => d.roll)).size * 10 || 10;
  const absent = Math.max(0, total - present);

  const p = document.getElementById("presentCount");
  const a = document.getElementById("absentCount");

  if (p) p.innerText = present;
  if (a) a.innerText = absent;
}

/********************************
  CHARTS
*********************************/
function renderCharts() {
  if (!window.Chart) return;

  const data = JSON.parse(localStorage.getItem("attendance")) || [];
  if (!data.length) return;

  const present = data.filter(d => d.status === "Present").length;
  const total = new Set(data.map(d => d.roll)).size * 10 || 10;
  const absent = Math.max(0, total - present);

  const bar = document.getElementById("barChart");
  const pie = document.getElementById("pieChart");

  if (bar) {
    new Chart(bar, {
      type: "bar",
      data: {
        labels: ["Present", "Absent"],
        datasets: [{
          label: "Attendance",
          data: [present, absent]
        }]
      }
    });
  }

  if (pie) {
    new Chart(pie, {
      type: "pie",
      data: {
        labels: ["Present", "Absent"],
        datasets: [{
          data: [present, absent]
        }]
      }
    });
  }
}


/********************************
  EXPORT ATTENDANCE
*********************************/
function exportExcel() {
  const table = document.querySelector("table");
  if (!table) return alert("Table not found");

  const url = "data:application/vnd.ms-excel," + encodeURIComponent(table.outerHTML);
  const a = document.createElement("a");
  a.href = url;
  a.download = "attendance.xls";
  a.click();
}

/*********************
  EXPORT STUDENTS
**********************/
function exportStudentsExcel() {
  const table = document.getElementById("studentsTable");
  if (!table) return alert("Students table not found");

  const wb = XLSX.utils.table_to_book(table);
  XLSX.writeFile(wb, "students_list.xlsx");
}

/********************
  RESET
*********************/
function resetData() {
  if (!confirm('Are you sure you want to reset all attendance data?')) return;

  fetch('http://localhost:5000/reset', {
    method: 'DELETE',
    headers: {
      'Authorization': token
    }
  })
  .then(res => res.json())
  .then(data => {
    alert(data.msg);
    loadAttendanceTable();
  })
  .catch(err => {
    alert('Reset failed');
  });
}
app.delete('/reset', auth, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ msg: 'Only admin can reset' });
  }

  await Attendance.destroy({ where: {} });
  res.json({ msg: 'All attendance data deleted' });
});


/***************
 BACKUP DATA
****************/
function backupData() {
  const data = localStorage.getItem("attendance");
  if (!data) {
    alert("No attendance data to backup!");
    return;
  }

  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `attendance_backup_${new Date().toISOString().slice(0,10)}.json`;
  a.click();

  URL.revokeObjectURL(url);
}

/****************
 RESTORE DATA
 ****************/
function restoreData(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = function (e) {
    try {
      const data = JSON.parse(e.target.result);
      localStorage.setItem("attendance", JSON.stringify(data));
      alert("Data restored successfully!");
      location.reload();
    } catch {
      alert("Invalid backup file!");
    }
  };

  reader.readAsText(file);
}

/********************
  CAMERA INIT
*********************/
function initCamera() {
  const video = document.getElementById("video");
  if (!video) return;

  navigator.mediaDevices.getUserMedia({ video: true })
    .then(stream => video.srcObject = stream)
    .catch(() => console.log("Camera not allowed"));
}

function loadDefaulters() {
  const tbody = document.getElementById("tableData");
  if (!tbody) return;

  const data = JSON.parse(localStorage.getItem("attendance")) || [];
  const map = {};

  data.forEach(r => {
    if (!map[r.roll]) map[r.roll] = { ...r, count: 0 };
    map[r.roll].count++;
  });

  tbody.innerHTML = "";

  Object.values(map).forEach(s => {
    const percent = (s.count / 10) * 100;
    if (percent < 75) {
      tbody.innerHTML += `
        <tr>
          <td>${s.roll}</td>
          <td>${s.name}</td>
          <td>${s.subject}</td>
          <td>${s.date}</td>
          <td>${s.time}</td>
          <td>${percent.toFixed(1)}%</td>
        </tr>`;
    }
  });
} 
