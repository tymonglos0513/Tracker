import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { BACKEND, apiFetch, truncateText, downloadResume } from "../util";
import Modal from "../components/Modal";
import { DateTime } from "luxon";

export default function SchedulesPublic() {
  const { assignee } = useParams();
  const [rows, setRows] = useState([]);
  const [filterDate, setFilterDate] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState(null);
  const [modalData, setModalData] = useState({
    interview_stage: "",
    next_steps: "",
    interview_link: "",
    interview_datetime: "",
    duration: "",
  });
  const [selectedRow, setSelectedRow] = useState(null);

  async function fetchData() {
    const params = new URLSearchParams();
    if (assignee) params.append("assignee", assignee);
    if (filterDate.trim() !== "") params.append("date", filterDate.trim());

    const res = await apiFetch(`${BACKEND}/api/schedules?${params.toString()}`);
    const data = await res;
    setRows(data.data || []);
  }

  useEffect(() => {
    fetchData();
  }, [assignee, filterDate]);

  function openModal(type, row) {
    setModalType(type);
    setSelectedRow(row);
    setModalData({
      interview_stage: "",
      next_steps: "",
      interview_link: "",
      interview_datetime: "",
      duration: "",
    });
    setModalOpen(true);
  }

  function convertCETtoIran(cetStr) {
    if (!cetStr) return "-";
    try {
        // Parse CET time like "2025-11-07 14:30:00 CET"
        const parsed = DateTime.fromFormat(cetStr.replace("CET", "").trim(), "yyyy-MM-dd HH:mm:ss", {
        zone: "Europe/Warsaw",
        });
        if (!parsed.isValid) return "-";
        // Convert to Tehran timezone
        const iranTime = parsed.setZone("Asia/Tehran");
        return iranTime.toFormat("yyyy-MM-dd HH:mm:ss 'IRDT'");
    } catch (err) {
        console.error("Failed to convert CET to Iran:", err);
        return "-";
    }
 }

  async function handleModalSave() {
    if (!selectedRow) return;

    let newStatus = "waiting";
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
      duration: modalData.duration,
      passed: modalType === "passed",
      status: newStatus,
    };

    const res = await apiFetch(`${BACKEND}/api/schedules`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      fetchData();
      setModalOpen(false);
    } else {
      alert(await res.text());
    }
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-semibold mb-6 text-indigo-700 dark:text-indigo-400">
        Schedules — {assignee}
      </h2>

      <div className="flex gap-4 mb-6">
        <input
          type="date"
          className="border rounded px-3 py-2"
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
          placeholder="Filter by date (YYYY-MM-DD)"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden">
          <thead className="bg-indigo-600 text-white">
            <tr>
              <th className="px-4 py-3 text-left">Interview DateTime (Iran)</th>
              <th className="px-4 py-3 text-left">Profile</th>
              <th className="px-4 py-3 text-left">Company</th>
              <th className="px-4 py-3 text-left">Role</th>
              <th className="px-4 py-3 text-left">Link</th>
              <th className="px-4 py-3 text-left">Resume</th>
              <th className="px-4 py-3 text-left">Interview Link</th>
              <th className="px-4 py-3 text-left">Interview DateTime (CET)</th>
              <th className="px-4 py-3 text-left">Stage</th>
              <th className="px-4 py-3 text-left">Next Steps</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => (
              <tr
                key={idx}
                className={
                  idx % 2 ? "bg-gray-50 dark:bg-gray-700" : "dark:bg-gray-800"
                }
              >
                <td className="px-4 py-2 border-t text-sm text-gray-700 dark:text-gray-300">
                    {convertCETtoIran(r.interview_datetime)}
                </td>
                <td className="px-4 py-2 border-t">{r.profile_name}</td>
                <td className="px-4 py-2 border-t">{r.company_name}</td>
                <td className="px-4 py-2 border-t">{r.role_name}</td>
                <td className="px-4 py-2 border-t text-blue-600 dark:text-blue-400 break-all">
                  <a href={r.link} target="_blank" rel="noreferrer">
                    {truncateText(r.link)}
                  </a>
                </td>
                <td
                  className="px-4 py-2 border-t font-mono text-sm text-blue-600 dark:text-blue-400 underline cursor-pointer"
                  onClick={() =>
                    downloadResume(
                      r.resumeid,
                      `${r.company_name}-${r.role_name}.pdf`
                    )
                  }
                >
                  {r.resumeid}
                </td>
                <td className="px-4 py-2 border-t text-blue-600 dark:text-blue-400 break-all">
                  {r.interview_link ? (
                    <a href={r.interview_link} target="_blank" rel="noreferrer">
                      {truncateText(r.interview_link)}
                    </a>
                  ) : (
                    "-"
                  )}
                </td>
                <td className="px-4 py-2 border-t text-sm text-gray-700 dark:text-gray-300">
                  {r.interview_datetime || "-"}
                  <b> {" (" + (r.duration || "-") + ")"}</b>
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
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        open={modalOpen}
        title={modalType === "failed" ? "Mark as Failed" : "Mark as Done"}
        onClose={() => setModalOpen(false)}
        onSave={handleModalSave}
      >
        {(modalType === "failed" || modalType === "done") && (
          <>
            <label className="block text-sm font-medium mb-1">Next Steps/Reason</label>
            <textarea
              className="border rounded w-full px-2 py-1"
              value={modalData.next_steps}
              onChange={(e) =>
                setModalData({ ...modalData, next_steps: e.target.value })
              }
            />
          </>
        )}
      </Modal>
    </div>
  );
}
