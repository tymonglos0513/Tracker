
import React,{useEffect,useState} from 'react';
import { BACKEND, downloadResume, apiFetch, truncateText, promptText } from '../util'
import Modal from "../components/Modal";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { enUS } from "date-fns/locale";
// import { zonedTimeToUtc } from "date-fns-tz";

const locales = { "en-US": enUS };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

const eventColors = {
  scheduled: "bg-green-500 text-white",
  waiting: "bg-yellow-500 text-white",
  failed: "bg-red-500 text-white"
};

export default function SchedulesList(){
  const [profileName,setProfileName]=useState('');
  const [rows,setRows]=useState([]);
  const [filterAssignee, setFilterAssignee] = useState("");
  const [form,setForm]=useState({company_name:'',role_name:'',link:'',interview_stage:'',next_steps:'',resumeid:''});
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState(null);
  const [modalData, setModalData] = useState({ interview_stage: "", next_steps: "" });
  const [selectedRow, setSelectedRow] = useState(null);
  const [filterDate, setFilterDate] = useState('');
  const [promptModalOpen, setPromptModalOpen] = useState(false);
  const [promptJobDesc, setPromptJobDesc] = useState("");
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({
    profile_name: "",
    company_name: "",
    role_name: "",
    link: "",
    resumeid: "",
    interview_link: "",
    interview_datetime: "",
    duration: "",
    interview_stage: "",
    next_steps: "",
    assignee: "",
    status: "waiting"
  });
  const [calendarOpen, setCalendarOpen] = useState(false);

  async function fetchData() {
    const params = new URLSearchParams();
    if (profileName.trim() !== "") params.append("profile_name", profileName.trim());
    if (filterDate.trim() !== "") params.append("date", filterDate.trim());
    if (filterAssignee.trim() !== "") params.append("assignee", filterAssignee.trim());

    const url = `${BACKEND}/api/schedules?${params.toString()}`;
    const res = await apiFetch(url);
    const data = await res;
    setRows(data.data || []);
  }

  useEffect(()=>{fetchData()},[profileName]);
  useEffect(()=>{fetchData()},[filterDate]);
  useEffect(()=>{fetchData()},[filterAssignee]);
  async function saveRow(r){
    const payload={profile_name:r.profile_name,company_name:r.company_name,role_name:r.role_name,job_link:r.link,resumeid:r.resumeid,interview_stage:r.interview_stage||null,next_steps:r.next_steps||null};
    const res=await apiFetch(`${BACKEND}/api/schedules`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    if(res.ok)fetchData();else alert(await res.text());
  }
  async function onAddNew(){
    const r={company_name:form.company_name.trim(),role_name:form.role_name.trim(),link:form.link.trim(),interview_stage:form.interview_stage||null,next_steps:form.next_steps||null,resumeid:form.resumeid.trim()||''};
    if(!r.company_name||!r.role_name||!r.link){alert('Company, role and link are required.');return;}
    await saveRow(r);setForm({company_name:'',role_name:'',link:'',interview_stage:'',next_steps:'',resumeid:''});
  }
  function updateRowField(i,k,v){const c=[...rows];c[i]={...c[i],[k]:v};setRows(c);}

  function openModal(type, row) {
    setModalType(type);
    setSelectedRow(row);
    setModalData({ interview_stage: "", next_steps: "" });
    setModalOpen(true);
  }

  function openPromptModal(row) {
    setSelectedRow(row);
    setPromptJobDesc("");
    setPromptModalOpen(true);
  }

  function resumeToText(resume) {
    if (!resume || typeof resume !== "object") return "";

    const lines = [];
    const add = (txt = "") => lines.push(txt);

    // === HEADER ===
    add(resume.name?.toUpperCase() || "");
    if (resume.role_name) add(resume.role_name);
    if (resume.email || resume.phone) add(`${resume.email || ""}  ${resume.phone || ""}`.trim());
    if (resume.address) add(resume.address);
    if (resume.linkedin) add(`LinkedIn: ${resume.linkedin}`);
    add("");

    // === PROFILE SUMMARY ===
    if (resume.profile_summary) {
      add("PROFILE SUMMARY:");
      add(resume.profile_summary.replace(/\*\*/g, "")); // strip markdown asterisks
      add("");
    }

    // === SKILLS ===
    if (resume.skills) {
      add("SKILLS:");
      add(resume.skills.replace(/\*\*/g, "").replace(/\t/g, "    "));
      add("");
    }

    // === EXPERIENCE ===
    if (resume.experience && Array.isArray(resume.experience) && resume.experience.length) {
      add("PROFESSIONAL EXPERIENCE:");
      for (const exp of resume.experience) {
        const header =
          `• ${exp.role || ""} — ${exp.company || ""}` +
          (exp.from_date || exp.to_date ? ` (${exp.from_date || ""} - ${exp.to_date || ""})` : "");
        add(header.trim());
        if (exp.location) add(`  Location: ${exp.location}`);
        if (exp.responsibilities) {
          // split multiline responsibilities into bullets
          const bullets = exp.responsibilities
            .replace(/\*\*/g, "")
            .split("\n")
            .map((x) => x.trim())
            .filter(Boolean);
          for (const b of bullets) add(`  - ${b}`);
        }
        add("");
      }
    }

    // === EDUCATION ===
    if (resume.education && Array.isArray(resume.education) && resume.education.length) {
      add("EDUCATION:");
      for (const edu of resume.education) {
        const line =
          `• ${edu.degree || ""}` +
          (edu.category ? ` in ${edu.category}` : "") +
          (edu.university ? ` — ${edu.university}` : "") +
          (edu.location ? ` (${edu.location})` : "");
        add(line);
        if (edu.from_year || edu.to_year)
          add(`  Years: ${edu.from_year || ""} - ${edu.to_year || ""}`);
      }
      add("");
    }

    return lines.join("\n");
  }

  async function handlePromptCopy() {
    if (!selectedRow) return;

    try {
      // 1️⃣ Fetch resume JSON
      const res = await apiFetch(`${BACKEND}/api/resumes/${selectedRow.resumeid}`);
      const resumeTxt = resumeToText(res.resume);

      console.log(resumeTxt)
      console.log(promptJobDesc)

      // 2️⃣ Compose final clipboard text
      const finalText =
        `${resumeTxt}\n\nAbove is my resume.\n\n\n\n\n\n\n` +
        `${promptJobDesc}\n\n\n\n\n\n\n` +
        `Above is job description\n\n\n\n\n\n\n` +
        `${promptText}`;

      // 3️⃣ Copy to clipboard
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(finalText);
      } else {
        // fallback method
        const textArea = document.createElement("textarea");
        textArea.value = finalText;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }

      alert("✅ Copied to clipboard!");
      setPromptModalOpen(false);
    } catch (err) {
      console.error("Prompt copy failed", err);
      alert("❌ Failed to copy prompt: " + err.message);
    }
  }

  async function handleModalSave() {
    if (!selectedRow) return;

    let newStatus = "waiting";
    if (modalType === "passed") newStatus = "scheduled";
    if (modalType === "failed") newStatus = "failed";
    if (modalType === "done") newStatus = "waiting";

    const payload = {
      profile_name: selectedRow.profile_name,
      company_name: selectedRow.company_name,
      role_name: selectedRow.role_name,
      job_link: selectedRow.link,
      resumeid: selectedRow.resumeid,
      interview_stage: modalData.interview_stage,
      next_steps: modalData.next_steps,
      interview_link: modalData.interview_link,
      interview_datetime: modalData.interview_datetime,
      passed: modalType === "passed",
      status: newStatus,
      duration: modalData.duration
    };

    const res = await apiFetch(`${BACKEND}/api/schedules`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      fetchData();
      setModalOpen(false);
    } else alert(await res.text());
  }

  async function deleteSchedule(row) {
    if (!window.confirm(`Delete schedule for ${row.company_name} - ${row.role_name}?`)) return;
    const params = new URLSearchParams({
      profile_name: row.profile_name,
      company_name: row.company_name,
      role_name: row.role_name
    });
    const res = await apiFetch(`${BACKEND}/api/schedules?${params}`, {
      method: "DELETE"
    });
    if (res.ok) {
      fetchData();
    } else {
      alert(await res.text());
    }
  }

  function openEditModal(row) {
    if (row) {
      setEditMode(true);
      setEditData({
        ...row,
        link: row.link || "",
        interview_link: row.interview_link || "",
        interview_datetime: storedToLocalInput(row.interview_datetime),
        duration: row.duration || "",
        interview_stage: row.interview_stage || "",
        next_steps: row.next_steps || "",
        assignee: row.assignee || "",
        status: row.status || "waiting",
      });
    } else {
      setEditMode(false);
      setEditData({
        profile_name: profileName || "",
        company_name: "",
        role_name: "",
        link: "",
        resumeid: "",
        interview_link: "",
        interview_datetime: "",
        duration: "",
        interview_stage: "",
        next_steps: "",
        assignee: "",
        status: "waiting",
      });
    }
    setEditModalOpen(true);
  }

  async function handleEditSave() {
    if (!editData.company_name || !editData.role_name) {
      alert("Company and Role are required.");
      return;
    }

    const payload = {
      profile_name: editData.profile_name,
      company_name: editData.company_name,
      role_name: editData.role_name,
      job_link: editData.link,
      resumeid: editData.resumeid,
      interview_stage: editData.interview_stage,
      next_steps: editData.next_steps,
      interview_link: editData.interview_link,
      interview_datetime: editData.interview_datetime,
      assignee: editData.assignee,
      duration: editData.duration,
      status: editData.status,
    };

    const res = await apiFetch(`${BACKEND}/api/schedules`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      fetchData();
      setEditModalOpen(false);
    } else {
      alert(await res.text());
    }
  }

  function parseInterviewCET(str) {
    if (!str) return null;

    // already ISO with offset? let the browser handle it
    if (/T\d{2}:\d{2}:\d{2}(?:\.\d+)?([+-]\d{2}:\d{2}|Z)$/i.test(str)) {
      const d = new Date(str);
      return isNaN(d) ? null : d;
    }

    // normalize: strip (CET)/(CEST), keep date+time
    let clean = String(str).replace(/\(?(CET|CEST)\)?/i, (_, tz) => tz.toUpperCase()).trim();

    // match "YYYY-MM-DD HH:mm:ss"
    const m = clean.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})(?:\s*(CET|CEST))?$/i);
    if (m) {
      const [, ymd, hms, zoneRaw] = m;
      const zone = (zoneRaw || "CET").toUpperCase();
      // CET = +01:00, CEST = +02:00
      const offset = zone === "CEST" ? "+02:00" : "+01:00";
      const iso = `${ymd}T${hms}${offset}`;
      const d = new Date(iso);
      return isNaN(d) ? null : d;
    }

    // last resort: try native parsing
    const d = new Date(clean);
    return isNaN(d) ? null : d;
  }

  function toDatetimeLocalInput(date) {
    if (!(date instanceof Date) || isNaN(date)) return "";
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    const hh = String(date.getHours()).padStart(2, "0");
    const mm = String(date.getMinutes()).padStart(2, "0");
    return `${y}-${m}-${d}T${hh}:${mm}`;   // format for <input type="datetime-local">
  }

  function storedToLocalInput(str) {
    const d = parseInterviewCET(str);
    return d ? toDatetimeLocalInput(d) : "";
  }

  function toCETLocalString(date) {
    if (!(date instanceof Date) || isNaN(date)) return "";
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`; // ✅ local (CET) string
  }

  return(<div>
    <h2 className="text-2xl font-semibold mb-4 text-indigo-700 dark:text-indigo-400">Schedules</h2>
    <div className="flex gap-4 mb-6">
      <input className="border rounded px-3 py-2" value={profileName} onChange={e=>setProfileName(e.target.value)} placeholder="Profile name"/>
      <input
        type="date"
        className="border rounded px-3 py-2"
        value={filterDate}
        onChange={(e) => setFilterDate(e.target.value)}
        placeholder="Filter by date (YYYY-MM-DD)"
      />
      <input
        className="border rounded px-3 py-2"
        value={filterAssignee}
        onChange={(e) => setFilterAssignee(e.target.value)}
        placeholder="Search by assignee"
      />
      <button
        onClick={() => openEditModal(null)}
        className="bg-indigo-600 text-white px-3 py-2 rounded hover:bg-indigo-700 text-sm"
      >
        + Add Schedule
      </button>
      <button
        onClick={() => setCalendarOpen(true)}
        className="bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700 text-sm"
      >
        📅 Calendar View
      </button>
    </div>
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden">
        <thead className="bg-indigo-600 text-white">
          <tr>
            <th className="px-4 py-3 text-left">Interview DateTime (CET)</th>
            <th className="px-4 py-3 text-left">Profile</th>
            <th className="px-4 py-3 text-left">Assignee</th>
            <th className="px-4 py-3 text-left">Company</th>
            <th className="px-4 py-3 text-left">Role</th>
            <th className="px-4 py-3 text-left">Link</th>
            <th className="px-4 py-3 text-left">Resume ID</th>
            <th className="px-4 py-3 text-left">Interview Link</th>
            <th className="px-4 py-3 text-left">Interview Stage</th>
            <th className="px-4 py-3 text-left">Next Steps</th>
            <th className="px-4 py-3 text-left">Status</th>
            <th className="px-4 py-3 text-left">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r,idx)=>(<tr key={idx} className={idx%2?"bg-gray-50 dark:bg-gray-700":"dark:bg-gray-800"}>
            <td className="px-4 py-2 border-t text-sm text-gray-700 dark:text-gray-300">
              {r.interview_datetime || "-"}
              <b> { "(" + (r.duration || "-") + ")" }</b>
            </td>
            <td className="px-4 py-2 border-t font-medium text-sm text-gray-700 dark:text-gray-200">
              {r.profile_name || "-"}
            </td>
            <td className="px-4 py-2 border-t text-sm">
              {r.assignee ? (
                <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs">
                  {r.assignee}
                </span>
              ) : (
                <span className="text-gray-400 italic text-xs">Unassigned</span>
              )}
            </td>
            <td className="px-4 py-2 border-t">{r.company_name}</td>
            <td className="px-4 py-2 border-t">{r.role_name}</td>
            <td className="px-4 py-2 border-t text-blue-600 dark:text-blue-400 break-all"><a href={r.link} target="_blank" rel="noreferrer">{truncateText(r.link)}</a></td>
            <td className="px-4 py-2 border-t font-mono text-sm text-blue-600 dark:text-blue-400 underline cursor-pointer"
                onClick={() => downloadResume(r.resumeid, `${r.company_name}-${r.role_name}.pdf`)}>
              {r.resumeid}
            </td>
            <td className="px-4 py-2 border-t text-blue-600 dark:text-blue-400 break-all">
              {r.interview_link ? (
                <a href={r.interview_link} target="_blank" rel="noreferrer">{truncateText(r.interview_link)}</a>
              ) : (
                "-"
              )}
            </td>
            <td className="px-4 py-2 border-t">
              <div className="flex flex-wrap gap-1 mb-1">
                {[
                  // unique previous steps, excluding current stage
                  ...new Set((r.previous_steps || []).filter((s) => s !== r.interview_stage)),
                ].map((step, i) => (
                  <span
                    key={i}
                    className="bg-green-200 text-green-800 text-xs px-2 py-0.5 rounded-full"
                  >
                    {step}
                  </span>
                ))}
                {r.status === "scheduled" && r.interview_stage && (
                  <span
                    className={`bg-yellow-200 text-yellow-800 text-xs px-2 py-0.5 rounded-full`}
                  >
                    {r.interview_stage}
                  </span>
                )}
                {r.status === "waiting" && r.interview_stage && (
                  <span
                    className={`bg-green-200 text-green-800 text-xs px-2 py-0.5 rounded-full`}
                  >
                    {r.interview_stage}
                  </span>
                )}
                {r.status === "failed" && r.previous_steps?.length > 0 && (
                  <span className="bg-red-300 text-red-900 text-xs px-2 py-0.5 rounded-full">
                    Failed
                  </span>
                )}
              </div>
            </td>

            <td className="px-4 py-2 border-t text-sm">
              {r.next_steps || "-"}
            </td>

            <td className="px-4 py-2 border-t">
              <span
                className={`text-xs font-semibold px-2 py-1 rounded-full ${
                  r.status === "scheduled"
                    ? "bg-green-100 text-green-700"
                    : r.status === "failed"
                    ? "bg-red-100 text-red-700"
                    : "bg-yellow-100 text-yellow-700"
                }`}
              >
                {r.status || "waiting"}
              </span>
            </td>

            <td className="px-4 py-2 border-t flex gap-1">
              <button
                onClick={() => openModal("passed", r)}
                className="bg-green-600 text-white px-2 py-0.5 text-sm rounded hover:bg-green-700"
              >
                Passed
              </button>
              <button
                onClick={() => openModal("failed", r)}
                className="bg-red-600 text-white px-2 py-0.5 text-sm rounded hover:bg-red-700"
              >
                Failed
              </button>
              <button
                onClick={() => openModal("done", r)}
                className="bg-yellow-500 text-white px-2 py-0.5 text-sm rounded hover:bg-yellow-600"
              >
                Done
              </button>
              <button
                onClick={() => openPromptModal(r)}
                className="bg-purple-600 text-white px-2 py-0.5 text-sm rounded hover:bg-purple-700"
              >
                Prompt
              </button>
              <button
                onClick={() => deleteSchedule(r)}
                className="bg-gray-500 text-white px-2 py-0.5 text-sm rounded hover:bg-gray-600"
              >
                Delete
              </button>
              <button
                onClick={() => openEditModal(r)}
                className="bg-blue-600 text-white px-2 py-0.5 text-sm rounded hover:bg-blue-700"
              >
                Edit
              </button>
            </td>
          </tr>))}
        </tbody>
      </table>
    </div>

    <Modal
      open={modalOpen}
      title={
        modalType === "passed"
          ? "Mark as Passed"
          : modalType === "failed"
          ? "Mark as Failed"
          : "Mark as Done"
      }
      onClose={() => setModalOpen(false)}
      onSave={handleModalSave}
    >
      {modalType === "passed" && (
        <>
          <label className="block text-sm font-medium mb-1">Interview Stage</label>
          <input
            className="border rounded w-full px-2 py-1 mb-2"
            value={modalData.interview_stage}
            onChange={(e) =>
              setModalData({ ...modalData, interview_stage: e.target.value })
            }
          />
          <label className="block text-sm font-medium mb-1">Next Steps</label>
          <textarea
            className="border rounded w-full px-2 py-1 mb-2"
            value={modalData.next_steps}
            onChange={(e) =>
              setModalData({ ...modalData, next_steps: e.target.value })
            }
          />
          <label className="block text-sm font-medium mb-1">Interview Link</label>
          <input
            className="border rounded w-full px-2 py-1 mb-2"
            placeholder="https://meet.example.com"
            value={modalData.interview_link || ""}
            onChange={(e) =>
              setModalData({ ...modalData, interview_link: e.target.value })
            }
          />
          <label className="block text-sm font-medium mb-1">Interview DateTime (CET)</label>
          <input
            type="datetime-local"
            className="border rounded w-full px-2 py-1"
            value={modalData.interview_datetime || ""}
            onChange={(e) =>
              setModalData({ ...modalData, interview_datetime: e.target.value })
            }
          />
          <label className="block text-sm font-medium mb-1">Duration</label>
          <input
            className="border rounded w-full px-2 py-1 mb-2"
            placeholder="e.g. 45 min"
            value={modalData.duration || ""}
            onChange={(e) =>
              setModalData({ ...modalData, duration: e.target.value })
            }
          />
        </>
      )}
      {(modalType === "failed" || modalType === "done") && (
        <>
          <label className="block text-sm font-medium mb-1">Next Steps/Reason</label>
          <textarea
            className="border rounded w-full px-2 py-1"
            value={modalData.next_steps}
            onChange={(e) => setModalData({ ...modalData, next_steps: e.target.value })}
          />
        </>
      )}
    </Modal>

    <Modal
      open={promptModalOpen}
      title="Generate Prompt"
      onClose={() => setPromptModalOpen(false)}
      hideFooter={true}
    >
      {selectedRow && (
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">
            Job Link
          </label>
          <a
            href={selectedRow.link}
            target="_blank"
            rel="noreferrer"
            className="text-blue-600 dark:text-blue-400 underline break-all"
            title={selectedRow.link}
          >
            { truncateText(selectedRow.link) }
          </a>
        </div>
      )}
      <label className="block text-sm font-medium mb-1">Job Description</label>
      <textarea
        className="border rounded w-full px-2 py-1 mb-3 h-40 resize-y"
        placeholder="Paste or type job description here..."
        value={promptJobDesc}
        onChange={(e) => setPromptJobDesc(e.target.value)}
      ></textarea>

      <div className="flex justify-end space-x-2">
        <button
          onClick={handlePromptCopy}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          Copy
        </button>
        <button
          onClick={() => setPromptModalOpen(false)}
          className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500"
        >
          Close
        </button>
      </div>
    </Modal>
    <Modal
      open={editModalOpen}
      title={editMode ? "Edit Schedule" : "Add Schedule"}
      onClose={() => setEditModalOpen(false)}
      onSave={handleEditSave}
    >
      <label className="block text-sm font-medium mb-1">Profile Name</label>
      <input
        className="border rounded w-full px-2 py-1 mb-2"
        value={editData.profile_name}
        onChange={(e) => setEditData({ ...editData, profile_name: e.target.value })}
      />

      <label className="block text-sm font-medium mb-1">Company Name</label>
      <input
        className="border rounded w-full px-2 py-1 mb-2"
        value={editData.company_name}
        onChange={(e) => setEditData({ ...editData, company_name: e.target.value })}
      />

      <label className="block text-sm font-medium mb-1">Role Name</label>
      <input
        className="border rounded w-full px-2 py-1 mb-2"
        value={editData.role_name}
        onChange={(e) => setEditData({ ...editData, role_name: e.target.value })}
      />

      <label className="block text-sm font-medium mb-1">Job Link</label>
      <input
        className="border rounded w-full px-2 py-1 mb-2"
        value={editData.link}
        onChange={(e) => setEditData({ ...editData, link: e.target.value })}
      />

      <label className="block text-sm font-medium mb-1">Resume ID</label>
      <input
        className="border rounded w-full px-2 py-1 mb-2"
        value={editData.resumeid}
        onChange={(e) => setEditData({ ...editData, resumeid: e.target.value })}
      />

      <label className="block text-sm font-medium mb-1">Interview Link</label>
      <input
        className="border rounded w-full px-2 py-1 mb-2"
        value={editData.interview_link}
        onChange={(e) => setEditData({ ...editData, interview_link: e.target.value })}
      />

      <label className="block text-sm font-medium mb-1">Interview DateTime (CET)</label>
      <input
        type="datetime-local"
        className="border rounded w-full px-2 py-1 mb-2"
        value={toCETLocalString(parseInterviewCET(editData.interview_datetime) || new Date())}
        onChange={(e) => setEditData({ ...editData, interview_datetime: e.target.value })}
      />

      <label className="block text-sm font-medium mb-1">Duration</label>
      <input
        className="border rounded w-full px-2 py-1 mb-2"
        value={editData.duration}
        onChange={(e) => setEditData({ ...editData, duration: e.target.value })}
      />

      <label className="block text-sm font-medium mb-1">Interview Stage</label>
      <input
        className="border rounded w-full px-2 py-1 mb-2"
        value={editData.interview_stage}
        onChange={(e) => setEditData({ ...editData, interview_stage: e.target.value })}
      />

      <label className="block text-sm font-medium mb-1">Next Steps</label>
      <textarea
        className="border rounded w-full px-2 py-1 mb-2"
        value={editData.next_steps}
        onChange={(e) => setEditData({ ...editData, next_steps: e.target.value })}
      />

      <label className="block text-sm font-medium mb-1">Assignee</label>
      <input
        className="border rounded w-full px-2 py-1 mb-2"
        value={editData.assignee}
        onChange={(e) => setEditData({ ...editData, assignee: e.target.value })}
      />

      <label className="block text-sm font-medium mb-1">Status</label>
      <select
        className="border rounded w-full px-2 py-1 mb-2"
        value={editData.status}
        onChange={(e) => setEditData({ ...editData, status: e.target.value })}
      >
        <option value="waiting">Waiting</option>
        <option value="scheduled">Scheduled</option>
        <option value="failed">Failed</option>
      </select>
    </Modal>
    <Modal
      open={calendarOpen}
      title="Schedules Calendar"
      onClose={() => setCalendarOpen(false)}
      wide={true}
    >
      <div className="h-[70vh]">
        <Calendar
          localizer={localizer}
          defaultView="week"
          defaultDate={new Date()}
          events={rows
            .filter((r) => r.interview_datetime)
            .map((r) => {
              const start = parseInterviewCET(r.interview_datetime) || new Date();
              const minutes = (() => {
                // support “45”, “45 min”, “30 mins”, “60 min(s)”
                const m = String(r.duration || "").match(/(\d+)/);
                return m ? parseInt(m[1], 10) : 60;
              })();
              const end = new Date(start.getTime() + minutes * 60000);

              return {
                title: `${r.company_name} - ${r.role_name}`,
                start,
                end,
                allDay: false,
                status: r.status,
                resource: r,
              };
            })}
          startAccessor="start"
          endAccessor="end"
          style={{ height: "100%", backgroundColor: "white", borderRadius: "8px" }}
          eventPropGetter={(event) => {
            const base = eventColors[event.status] || "bg-gray-400 text-white";
            return {
              className: base + " rounded px-1 text-xs",
              style: {
                border: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }
            };
          }}
          onSelectEvent={(event) => {
            const selected = event.resource;
            if (selected) {
              openEditModal(selected);
              setCalendarOpen(false);
            }
          }}
          onSelectSlot={(slotInfo) => {
            const clickedDate = slotInfo.start;
            const formatted = toCETLocalString(clickedDate);

            openEditModal({
              profile_name: profileName,
              company_name: "",
              role_name: "",
              link: "",
              resumeid: "",
              interview_link: "",
              interview_datetime: formatted,
              duration: "60",
              interview_stage: "",
              next_steps: "",
              assignee: "",
              previous_steps: [],
              status: "scheduled",
            });
            setCalendarOpen(false);
          }}
          selectable
        />
      </div>
    </Modal>
  </div>);
}
