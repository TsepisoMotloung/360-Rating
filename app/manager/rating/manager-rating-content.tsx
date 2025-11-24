"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import MainLayout from "@/components/MainLayout";
import useUserAccess from "@/lib/useUserAccess";
import { Loader2, CheckCircle, UserCheck } from "lucide-react";
import { THEME } from "@/lib/theme";
import { subscribe } from "@/lib/sync";

export default function ManagerRatingPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const auth = searchParams.get("auth");
  const { userAccess: access, userEmail: accessEmail, loading: accessLoading } = useUserAccess();
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState<any[]>([]);

  useEffect(() => {
    if (!auth) {
      router.push("/");
      return;
    }
    fetchAssignments();

    const unsub = subscribe((ev) => {
      if (ev === 'assignments-updated' || ev === 'responses-updated') {
        fetchAssignments();
      }
    });
    return () => unsub();
  }, [auth]);

  const fetchAssignments = async () => {
    try {
      const response = await fetch(`/api/manager/assignments?auth=${encodeURIComponent(auth || "")}`);
      if (!response.ok) {
        if (response.status === 401) {
          router.push("/error-access-denied");
          return;
        }
        throw new Error("Failed to fetch assignments");
      }
      const data = await response.json();
      setAssignments(data.assignments || []);
    } catch (error) {
      console.error("Error fetching assignments:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || accessLoading) {
    return (
      <MainLayout userEmail={accessEmail} userRole="manager" userAccess={access} auth={auth || ""}>
        <div className="flex items-center justify-center py-12">
          <Loader2 className={`w-8 h-8 animate-spin ${THEME.primary.text}`} />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout userEmail={accessEmail} userRole="manager" userAccess={access} auth={auth || ""}>
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-gray-900">My Ratings</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {assignments.length === 0 ? (
            <div className="col-span-full text-center text-gray-500 py-12">
              <UserCheck className="mx-auto mb-4 w-10 h-10 text-gray-400" />
              <p>No assignments found for you this period.</p>
            </div>
          ) : (
            assignments.map((a) => (
              <div key={a.assignmentId} className="bg-gradient-to-br from-red-50 to-white border border-red-100 rounded-lg p-6 shadow-sm flex flex-col gap-2">
                <div className="flex items-center gap-3 mb-2">
                  <CheckCircle className={`w-6 h-6 ${a.isCompleted ? 'text-green-500' : 'text-gray-300'}`} />
                  <div>
                    <div className="font-semibold text-gray-900">{a.rateeFName} {a.rateeSurname}</div>
                    <div className="text-xs text-gray-500">{a.rateeEmail}</div>
                  </div>
                </div>
                <div className="text-sm text-gray-700 mb-1">
                  <span className="font-medium">Position:</span> {a.rateePosition || 'N/A'}
                </div>
                <div className="text-xs text-gray-500">
                  <span className="font-medium">Status:</span> {a.isCompleted ? 'Completed' : 'Pending'}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </MainLayout>
  );
}
