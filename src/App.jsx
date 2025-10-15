import React, { useState, useEffect, useMemo } from "react";
import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import {
  getFirestore,
  collection,
  onSnapshot,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAb9DlabhFjQnyzL64QQbdYi-Eerk2Jif0",
  authDomain: "brokerage-received.firebaseapp.com",
  projectId: "brokerage-received",
  storageBucket: "brokerage-received.firebasestorage.app",
  messagingSenderId: "113932197009",
  appId: "1:113932197009:web:546a681f613759a09cb330",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const SOURCES = [
  "Saraf Agencies",
  "Rajeev Saraf",
  "Rajeev Saraf HUF",
  "Suman Saraf",
  "Madhav Saraf",
];

const formatCurrency = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);

const PlusIcon = ({ className = "w-5 h-5" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth="2"
    stroke="currentColor"
    className={className}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m7-7H5" />
  </svg>
);
const TrashIcon = ({ className = "w-4 h-4" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth="2"
    stroke="currentColor"
    className={className}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m1 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6z"
    />
  </svg>
);
const CloseIcon = ({ className = "w-6 h-6" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth="2"
    stroke="currentColor"
    className={className}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M6 18L18 6M6 6l12 12"
    />
  </svg>
);

export default function App() {
  const [entries, setEntries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newEntry, setNewEntry] = useState({
    name: "",
    source: SOURCES[0],
    amount: "",
    date: new Date().toISOString().split("T")[0],
    received: false,
  });

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setNewEntry((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) setIsAuthReady(true);
      else {
        try {
          await signInAnonymously(auth);
        } catch (error) {
          console.error("Anonymous sign-in failed:", error);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!isAuthReady) return;
    setIsLoading(true);
    const q = query(collection(db, "brokerageEntries"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs
          .map((doc) => ({ id: doc.id, ...doc.data() }))
          .sort((a, b) => new Date(b.date) - new Date(a.date));
        setEntries(data);
        setIsLoading(false);
      },
      (error) => {
        console.error("Error fetching data:", error);
        setIsLoading(false);
      }
    );
    return () => unsubscribe();
  }, [isAuthReady]);

  const { groupedEntries, grandTotal } = useMemo(() => {
    const grouped = entries.reduce((acc, entry) => {
      const source = entry.source || "Uncategorized";
      if (!acc[source]) acc[source] = { entries: [], total: 0 };
      acc[source].entries.push(entry);
      acc[source].total += parseFloat(entry.amount) || 0;
      return acc;
    }, {});

    const total = entries.reduce(
      (sum, e) => sum + (parseFloat(e.amount) || 0),
      0
    );
    return {
      groupedEntries: Object.fromEntries(Object.entries(grouped).sort()),
      grandTotal: total,
    };
  }, [entries]);

  const handleAddEntry = async (e) => {
    e.preventDefault();
    if (!newEntry.amount || !newEntry.date || !newEntry.name) return;
    try {
      await addDoc(collection(db, "brokerageEntries"), {
        ...newEntry,
        amount: parseFloat(newEntry.amount),
        createdAt: serverTimestamp(),
      });
      setIsModalOpen(false);
      setNewEntry({
        name: "",
        source: SOURCES[0],
        amount: "",
        date: new Date().toISOString().split("T")[0],
        received: false,
      });
    } catch (error) {
      console.error("Error adding entry:", error);
    }
  };

  const toggleReceived = async (entry) => {
    const ref = doc(db, "brokerageEntries", entry.id);
    await updateDoc(ref, { received: !entry.received });
  };

  const handleDelete = async (id) => {
    await deleteDoc(doc(db, "brokerageEntries", id));
  };

  return (
    <div className="min-h-screen w-screen h-screen bg-blue-50 flex flex-col items-center p-6 font-sans text-gray-900 transition-colors">
      {/* Header */}
      <header className="flex flex-col items-center justify-center mb-8 w-full">
        <div className="flex items-center justify-center mb-6">
          <h2 className="text-3xl font-extrabold text-black text-center flex items-center gap-2">
            <span role="img" aria-label="moneybag">
              💰
            </span>
            Brokerage Received
            <span role="img" aria-label="moneybag">
              💰
            </span>
          </h2>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center space-x-2 bg-blue-200 text-blue-900 font-semibold px-4 py-2 rounded-lg hover:bg-blue-300 transition-all focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          <PlusIcon className="w-4 h-4" />
          <span>New</span>
        </button>
      </header>

      {/* Table */}
      <div className="w-full max-w-full border border-blue-100 rounded-lg overflow-auto bg-white shadow-sm px-4">
        <div className="overflow-auto">
          <table className="w-full text-left min-w-[600px]">
            <thead className="bg-blue-100">
              <tr>
                <th className="p-4 text-xs font-semibold text-blue-700 uppercase tracking-wider w-12 text-center">
                  #
                </th>
                <th className="p-4 text-xs font-semibold text-blue-700 uppercase tracking-wider">
                  Name
                </th>
                <th className="p-4 text-xs font-semibold text-blue-700 uppercase tracking-wider">
                  Source
                </th>
                <th className="p-4 text-xs font-semibold text-blue-700 uppercase tracking-wider text-right">
                  Amount
                </th>
                <th className="p-4 text-xs font-semibold text-blue-700 uppercase tracking-wider">
                  Date
                </th>
                <th className="p-4 text-xs font-semibold text-blue-700 uppercase tracking-wider w-20 text-center">
                  Received
                </th>
                <th className="p-4 w-16"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-blue-100">
              {isLoading ? (
                <tr>
                  <td colSpan="7" className="text-center p-12 text-blue-400">
                    Loading...
                  </td>
                </tr>
              ) : Object.keys(groupedEntries).length > 0 ? (
                Object.entries(groupedEntries).map(([source, group]) => (
                  <React.Fragment key={source}>
                    <tr className="bg-blue-50">
                      <td
                        colSpan="7"
                        className="px-4 py-2 text-sm font-semibold text-blue-900"
                      >
                        {source}
                      </td>
                    </tr>
                    {group.entries.map((entry, index) => (
                      <tr
                        key={entry.id}
                        className="hover:bg-blue-100 transition-colors"
                      >
                        <td className="p-4 text-center text-sm text-blue-700">
                          {index + 1}
                        </td>
                        <td className="p-4 text-sm font-medium text-blue-900">
                          {entry.name}
                        </td>
                        <td className="p-4 text-sm text-blue-700">
                          {entry.source}
                        </td>
                        <td className="p-4 text-sm font-medium text-blue-900 text-right">
                          {formatCurrency(entry.amount)}
                        </td>
                        <td className="p-4 text-sm text-blue-700">
                          {new Date(entry.date).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                        <td className="p-4 text-center">
                          <input
                            type="checkbox"
                            checked={entry.received}
                            onChange={() => toggleReceived(entry)}
                            className="h-5 w-5 rounded border-blue-300 text-blue-600 focus:ring-blue-500 cursor-pointer bg-white"
                          />
                        </td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => handleDelete(entry.id)}
                            className="text-blue-400 hover:text-red-600 p-2 rounded-md transition-colors opacity-50 hover:opacity-100"
                          >
                            <TrashIcon />
                          </button>
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-blue-100 font-semibold">
                      <td
                        colSpan="3"
                        className="p-3 text-blue-700 text-right text-sm"
                      >
                        Sum
                      </td>
                      <td className="p-3 text-blue-900 text-right text-sm">
                        {formatCurrency(group.total)}
                      </td>
                      <td colSpan="3"></td>
                    </tr>
                  </React.Fragment>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="text-center p-12 text-blue-400">
                    No entries yet. Click "New" to get started.
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot className="bg-blue-100">
              <tr>
                <td
                  colSpan="3"
                  className="p-4 font-bold text-blue-900 text-right"
                >
                  Grand Total
                </td>
                <td className="p-4 font-bold text-blue-900 text-right">
                  {formatCurrency(grandTotal)}
                </td>
                <td colSpan="3"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-blue-700 bg-opacity-20 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-auto overflow-hidden relative">
            <div className="flex justify-between items-center p-6 border-b border-blue-100">
              <h2 className="text-xl font-semibold text-blue-900">
                Add New Entry
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-blue-500 hover:text-blue-900 rounded-full p-2 transition"
                aria-label="Close"
              >
                <CloseIcon className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleAddEntry} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-blue-700 mb-2">
                  Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={newEntry.name}
                  onChange={handleInputChange}
                  placeholder="e.g., Q4 Commission"
                  required
                  className="w-full px-4 py-3 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 text-blue-900 bg-blue-50 transition"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-blue-700 mb-2">
                  Source
                </label>
                <select
                  name="source"
                  value={newEntry.source}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 bg-blue-50 text-blue-900 transition"
                >
                  {SOURCES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-blue-700 mb-2">
                  Amount (INR)
                </label>
                <input
                  type="number"
                  name="amount"
                  value={newEntry.amount}
                  onChange={handleInputChange}
                  placeholder="e.g., 15000"
                  required
                  className="w-full px-4 py-3 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 text-blue-900 bg-blue-50 transition"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-blue-700 mb-2">
                  Date
                </label>
                <input
                  type="date"
                  name="date"
                  value={newEntry.date}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 bg-blue-50 text-blue-900 transition"
                />
              </div>
              <div className="flex items-center pt-2">
                <input
                  id="received"
                  name="received"
                  type="checkbox"
                  checked={newEntry.received}
                  onChange={handleInputChange}
                  className="h-5 w-5 rounded border-blue-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <label
                  htmlFor="received"
                  className="ml-3 text-sm text-blue-800 font-medium"
                >
                  Mark as received
                </label>
              </div>
              <div className="pt-4 flex justify-end">
                <button
                  type="submit"
                  className="bg-blue-700 hover:bg-blue-800 text-white font-semibold px-6 py-3 rounded-lg transition focus:outline-none focus:ring-2 focus:ring-blue-700 focus:ring-offset-2"
                >
                  Save Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
