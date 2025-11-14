
import React,{useEffect,useState} from 'react';
import { BACKEND, downloadResume, apiFetch, truncateText } from '../util'
import Modal from "../components/Modal";

export default function AppliedList(){
  const [profiles, setProfiles] = useState([]);
  const [profileName, setProfileName] = useState("");
  const[date,setDate]=useState();
  const[rows,setRows]=useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState({ interview_link: "", interview_datetime: "" });
  const [selectedRow, setSelectedRow] = useState(null);

  useEffect(() => {
    apiFetch("http://93.127.142.20:8000/resume/")
      .then((data) => {
        // Assuming response is like [{name:"Patryk"}, {name:"Franciszek"}]
        const names = Array.isArray(data["resumes"])
          ? data["resumes"].map((x) => x.name || x)
          : [];
        setProfiles(names);
        if (names.length > 0) setProfileName(names[0]); // default first
      })
      .catch((err) => console.error("Failed to load profiles", err));
  }, []);

  async function fetchData(){
    let url = `${BACKEND}/api/applied?profile_name=${encodeURIComponent(profileName)}`;
    if (date?.trim()) {
      url += `&date=${date.trim()}`;
    }
    const res = await apiFetch(url);
    const data=await res
    const map=data.data||{};const items=[];
    for(const company of Object.keys(map)){
      for(const role of Object.keys(map[company])){
        const it=map[company][role];
        items.push({profile_name:profileName,date,company_name:company,role_name:role,link:it.link,resumeid:it.resumeid});
      }
    }
    setRows(items);
  }

  function openInvokeModal(row) {
    setSelectedRow(row);
    setModalData({
      interview_link: "",
      interview_datetime: "",
      assignee: ""
    });
    setModalOpen(true);
  }

  async function handleInvokeSave() {
    if (!selectedRow) return;
    const payload = {
      profile_name: selectedRow.profile_name,
      company_name: selectedRow.company_name,
      role_name: selectedRow.role_name,
      job_link: selectedRow.link,
      resumeid: selectedRow.resumeid,
      interview_link: modalData.interview_link,
      interview_datetime: modalData.interview_datetime,
      assignee: modalData.assignee,
      duration: modalData.duration,
      interview_stage: "Intro",
      next_steps: "N/A",
      status: "scheduled",
      passed: false,
    };
    try {
      const res = await apiFetch(`${BACKEND}/api/schedules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        alert("Schedule created successfully!");
        setModalOpen(false);
      } else {
        alert("Error creating schedule: " + (await res.text()));
      }
    } catch (err) {
      alert("Network error: " + err.message);
    }
  }

  useEffect(()=>{fetchData()},[profileName,date]);
  return(<div>
    <h2 className="text-2xl font-semibold mb-4 text-indigo-700 dark:text-indigo-400">Applied Jobs</h2>
    <div className="flex gap-4 mb-6">
      <select
        className="border rounded px-3 py-2"
        value={profileName}
        onChange={(e) => setProfileName(e.target.value)}
      >
        {profiles.map((p) => (
          <option key={p} value={p}>{p}</option>
        ))}
      </select>
      <input className="border rounded px-3 py-2" type="date" value={date} onChange={e=>setDate(e.target.value)}/>
      <button onClick={fetchData} className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700">Refresh</button>
    </div>
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden">
        <thead className="bg-indigo-600 text-white"><tr>
          <th className="px-4 py-3 text-left">Profile</th><th className="px-4 py-3 text-left">Company</th>
          <th className="px-4 py-3 text-left">Role</th><th className="px-4 py-3 text-left">Link</th>
          <th className="px-4 py-3 text-left">Date</th><th className="px-4 py-3 text-left">Resume ID</th>
          <th className="px-4 py-3 text-left">Actions</th>
        </tr></thead>
        <tbody>
          {rows.map((r,idx)=>(
            <tr key={idx} className={idx%2?"bg-gray-50 dark:bg-gray-700":"dark:bg-gray-800"}>
              <td className="px-4 py-2 border-t">{r.profile_name}</td>
              <td className="px-4 py-2 border-t">{r.company_name}</td>
              <td className="px-4 py-2 border-t">{r.role_name}</td>
              <td className="px-4 py-2 border-t text-blue-600 dark:text-blue-400 break-all"><a href={r.link} target="_blank" rel="noreferrer">{truncateText(r.link)}</a></td>
              <td className="px-4 py-2 border-t">{r.date}</td>
              <td className="px-4 py-2 border-t font-mono text-sm text-blue-600 dark:text-blue-400 underline cursor-pointer"
                  onClick={() => downloadResume(r.resumeid, `${r.company_name}-${r.role_name}.pdf`)}>
                {r.resumeid}
              </td>
              <td className="px-4 py-2 border-t">
                <button
                  onClick={() => openInvokeModal(r)}
                  className="bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700"
                >
                  Invoke
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    <Modal
      open={modalOpen}
      title="Create Schedule for Interview"
      onClose={() => setModalOpen(false)}
      onSave={handleInvokeSave}
    >
      <label className="block text-sm font-medium mb-1">Interview Link</label>
      <input
        className="border rounded w-full px-2 py-1 mb-3"
        placeholder="https://meet.example.com"
        value={modalData.interview_link}
        onChange={(e) =>
          setModalData({ ...modalData, interview_link: e.target.value })
        }
      />
      <label className="block text-sm font-medium mb-1">Interview DateTime (CET)</label>
      <input
        type="datetime-local"
        className="border rounded w-full px-2 py-1 mb-3"
        value={modalData.interview_datetime}
        onChange={(e) =>
          setModalData({ ...modalData, interview_datetime: e.target.value })
        }
      />
      <label className="block text-sm font-medium mb-1">Duration</label>
      <input
        className="border rounded w-full px-2 py-1 mb-3"
        placeholder="e.g. 30 min, 1 hour"
        value={modalData.duration || ""}
        onChange={(e) =>
          setModalData({ ...modalData, duration: e.target.value })
        }
      />
      <label className="block text-sm font-medium mb-1">Assignee</label>
      <input
        className="border rounded w-full px-2 py-1"
        placeholder="Enter interviewer name or email"
        value={modalData.assignee || ""}
        onChange={(e) =>
          setModalData({ ...modalData, assignee: e.target.value })
        }
      />
    </Modal>
  </div>);
}
