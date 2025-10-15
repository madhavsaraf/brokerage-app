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

// --- Firebase Configuration ---
// This contains your unique keys to connect to the database.
const firebaseConfig = {
  apiKey: "AIzaSyAb9D1abhFJQnyzL64QQbdYi-Eerk2Jif0",
  authDomain: "brokerage-received.firebaseapp.com",
  projectId: "brokerage-received",
  storageBucket: "brokerage-received.appspot.com",
  messagingSenderId: "113932197009",
  appId: "1:113932197009:web:546a681f613759a09cb3D0",
};

// --- Initialize Firebase ---
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- Helper Functions & Constants ---
const SOURCES = [
  "Saraf Agencies",
  "Rajeev Saraf",
  "Rajeev Saraf HUF",
  "Suman Saraf",
  "Madhav Saraf",
];

const formatCurrency = (amount) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
};

// --- Icon Components ---
const PlusIcon = ({ className = "w-5 h-5" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
);
const TrashIcon = ({ className = "w-4 h-4" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <polyline points="3 6 5 6 21 6"></polyline>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
  </svg>
);
const CloseIcon = ({ className = "w-6 h-6" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

// --- Main App Component ---
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
      if (user) {
        setIsAuthReady(true);
      } else {
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
    const brokerageCollectionPath = "brokerageEntries";
    const q = query(collection(db, brokerageCollectionPath));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const entriesData = snapshot.docs
          .map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }))
          .sort((a, b) => new Date(b.date) - new Date(a.date));
        setEntries(entriesData);
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
      if (!acc[source]) {
        acc[source] = { entries: [], total: 0 };
      }
      acc[source].entries.push(entry);
      acc[source].total += parseFloat(entry.amount) || 0;
      return acc;
    }, {});

    const grandTotal = entries.reduce(
      (sum, entry) => sum + (parseFloat(entry.amount) || 0),
      0
    );

    const sortedGroupKeys = Object.keys(grouped).sort();
    const sortedGroupedEntries = sortedGroupKeys.reduce((acc, key) => {
      acc[key] = grouped[key];
      return acc;
    }, {});

    return { groupedEntries: sortedGroupedEntries, grandTotal };
  }, [entries]);

  const handleAddEntry = async (e) => {
    e.preventDefault();
    if (!newEntry.amount || !newEntry.date || !newEntry.name) {
      console.error("Please fill in all fields.");
      return;
    }

    const brokerageCollectionPath = "brokerageEntries";
    try {
      await addDoc(collection(db, brokerageCollectionPath), {
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
    const entryRef = doc(db, "brokerageEntries", entry.id);
    await updateDoc(entryRef, { received: !entry.received });
  };

  const handleDelete = async (id) => {
    const entryRef = doc(db, "brokerageEntries", id);
    await deleteDoc(entryRef);
  };

  return (
    <div className="bg-white min-h-screen font-sans text-gray-900">
      <main className="max-w-5xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-5xl mb-3">💰</h1>
            <h2 className="text-3xl font-bold text-gray-800">
              Brokerage Received
            </h2>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center space-x-2 bg-gray-100 text-gray-700 font-semibold px-4 py-2 rounded-lg hover:bg-gray-200 transition-all focus:outline-none focus:ring-2 focus:ring-gray-400"
          >
            <PlusIcon className="w-4 h-4" />
            <span>New</span>
          </button>
        </header>

        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider w-12 text-center">
                    #
                  </th>
                  <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Source
                  </th>
                  <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">
                    Amount
                  </th>
                  <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider w-20 text-center">
                    Received
                  </th>
                  <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider w-16 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {isLoading ? (
                  <tr>
                    <td colSpan="7" className="text-center p-12 text-gray-500">
                      Loading...
                    </td>
                  </tr>
                ) : Object.keys(groupedEntries).length > 0 ? (
                  <>
                    {Object.entries(groupedEntries).map(([source, group]) => (
                      <React.Fragment key={source}>
                        <tr className="bg-gray-50">
                          <td
                            colSpan="7"
                            className="px-4 py-2 text-sm font-semibold text-gray-800"
                          >
                            {source}
                          </td>
                        </tr>
                        {group.entries.map((entry, index) => (
                          <tr
                            key={entry.id}
                            className="hover:bg-gray-50 transition-colors"
                          >
                            <td className="p-4 text-center text-sm text-gray-500">
                              {index + 1}
                            </td>
                            <td className="p-4 text-sm font-medium text-gray-800">
                              {entry.name}
                            </td>
                            <td className="p-4 text-sm text-gray-600">
                              {entry.source}
                            </td>
                            <td className="p-4 text-sm font-medium text-gray-900 text-right">
                              {formatCurrency(entry.amount)}
                            </td>
                            <td className="p-4 text-sm text-gray-600">
                              {new Date(entry.date).toLocaleDateString(
                                "en-GB",
                                {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                }
                              )}
                            </td>
                            <td className="p-4 text-center">
                              <input
                                type="checkbox"
                                checked={entry.received}
                                onChange={() => toggleReceived(entry)}
                                className="h-5 w-5 rounded border-gray-300 text-gray-800 focus:ring-gray-700 cursor-pointer"
                              />
                            </td>
                            <td className="p-4 text-center">
                              <button
                                onClick={() => handleDelete(entry.id)}
                                className="text-gray-400 hover:text-red-500 p-2 rounded-md transition-colors opacity-50 hover:opacity-100"
                              >
                                <TrashIcon />
                              </button>
                            </td>
                          </tr>
                        ))}
                        <tr className="bg-gray-50 font-semibold">
                          <td
                            colSpan="3"
                            className="p-3 text-gray-600 text-right text-sm"
                          >
                            Sum
                          </td>
                          <td className="p-3 text-gray-800 text-right text-sm">
                            {formatCurrency(group.total)}
                          </td>
                          <td colSpan="3"></td>
                        </tr>
                      </React.Fragment>
                    ))}
                  </>
                ) : (
                  <tr>
                    <td colSpan="7" className="text-center p-12 text-gray-500">
                      No entries yet. Click "New" to get started.
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot className="bg-gray-100">
                <tr>
                  <td
                    colSpan="3"
                    className="p-4 font-bold text-gray-800 text-right"
                  >
                    Grand Total
                  </td>
                  <td className="p-4 font-bold text-gray-900 text-right">
                    {formatCurrency(grandTotal)}
                  </td>
                  <td colSpan="3"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </main>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md transform transition-all">
            <div className="flex justify-between items-center p-5 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-800">
                Add New Entry
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-full"
              >
                <CloseIcon className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddEntry} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={newEntry.name}
                  onChange={handleInputChange}
                  placeholder="e.g., Q4 Commission"
                  required
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-gray-800 focus:border-gray-800 transition"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Source
                </label>
                <select
                  name="source"
                  value={newEntry.source}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-gray-800 focus:border-gray-800 transition bg-white"
                >
                  {SOURCES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Amount (INR)
                </label>
                <input
                  type="number"
                  name="amount"
                  value={newEntry.amount}
                  onChange={handleInputChange}
                  placeholder="e.g., 15000"
                  required
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-gray-800 focus:border-gray-800 transition"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  name="date"
                  value={newEntry.date}
                  onChange={handleInputChange}
                  required
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-gray-800 focus:border-gray-800 transition"
                />
              </div>
              <div className="flex items-center pt-2">
                <input
                  id="received"
                  name="received"
                  type="checkbox"
                  checked={newEntry.received}
                  onChange={handleInputChange}
                  className="h-4 w-4 rounded border-gray-300 text-gray-800 focus:ring-gray-700 cursor-pointer"
                />
                <label
                  htmlFor="received"
                  className="ml-2 block text-sm text-gray-800"
                >
                  Mark as received
                </label>
              </div>
              <div className="pt-4 flex justify-end">
                <button
                  type="submit"
                  className="bg-gray-800 text-white font-semibold px-5 py-2 rounded-lg hover:bg-gray-700 transition-all focus:outline-none focus:ring-2 focus:ring-gray-800 focus:ring-offset-2"
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
