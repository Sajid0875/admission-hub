"use client";

import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Megaphone,
  Plus,
  RefreshCw,
  Search,
  ExternalLink,
  Archive,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableLoadingState,
  TableEmptyState,
} from "@/components/ui/Table";
import { Modal } from "@/components/ui/Modal";
import { marketingService } from "@/services/api/marketingService";
import { courseService } from "@/services/api/courseService";
import { useAuthStore } from "@/stores/useAuthStore";
import { useUIStore } from "@/stores/useUIStore";

const ASSET_TYPE_OPTIONS = [
  { value: "POSTER", label: "Poster" },
  { value: "BANNER", label: "Banner" },
  { value: "VIDEO", label: "Video" },
  { value: "REEL", label: "Reel" },
  { value: "CAPTION", label: "Caption" },
  { value: "WHATSAPP_TEMPLATE", label: "WhatsApp Template" },
  { value: "BROCHURE", label: "Brochure" },
  { value: "TESTIMONIAL", label: "Testimonial" },
];

export default function MarketingPage() {
  const queryClient = useQueryClient();
  const addToast = useUIStore((state) => state.addToast);
  const currentUser = useAuthStore((state) => state.user);
  const isSuperAdmin = currentUser?.role === "super_admin";

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [type, setType] = useState("POSTER");
  const [fileUrl, setFileUrl] = useState("");
  const [language, setLanguage] = useState("en");
  const [courseId, setCourseId] = useState("");

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["marketing-assets", search, typeFilter],
    queryFn: () =>
      marketingService.getAssets({
        page: 1,
        limit: 50,
        search: search.trim() || undefined,
        type: typeFilter === "all" ? "all" : typeFilter,
      }),
  });

  const { data: coursesPage } = useQuery({
    queryKey: ["courses", "marketing-picker"],
    queryFn: () => courseService.getCourses({ page: 1, limit: 50 }),
  });

  const assets = data?.data ?? [];
  const courseOptions = [
    { value: "", label: "No course link" },
    ...(coursesPage?.data ?? []).map((c) => ({
      value: c.id,
      label: c.title,
    })),
  ];

  const createMutation = useMutation({
    mutationFn: () =>
      marketingService.createAsset({
        title: title.trim(),
        type,
        fileUrl: fileUrl.trim(),
        language: language.trim() || "en",
        courseId: courseId || null,
      }),
    onSuccess: (asset) => {
      queryClient.invalidateQueries({ queryKey: ["marketing-assets"] });
      addToast({
        type: "success",
        title: "Asset Created",
        message: `${asset.title} is available to partners.`,
      });
      setIsCreateOpen(false);
      setTitle("");
      setFileUrl("");
      setLanguage("en");
      setCourseId("");
      setType("POSTER");
    },
    onError: (err: unknown) => {
      addToast({
        type: "error",
        title: "Create Failed",
        message: (err as { message?: string })?.message || "Could not create marketing asset.",
      });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: (id: string) => marketingService.archiveAsset(id),
    onSuccess: (asset) => {
      queryClient.invalidateQueries({ queryKey: ["marketing-assets"] });
      addToast({
        type: "info",
        title: "Asset Archived",
        message: `${asset.title} was soft-archived.`,
      });
    },
    onError: (err: unknown) => {
      addToast({
        type: "error",
        title: "Archive Failed",
        message: (err as { message?: string })?.message || "Could not archive asset.",
      });
    },
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Marketing Assets</h1>
            <span className="bg-violet-50 text-violet-700 text-xs font-bold px-2 py-0.5 rounded-full border border-violet-200">
              {data?.meta.total ?? assets.length} Assets
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Shared creatives and templates for partner outreach.
            {!isSuperAdmin && " Read-only for your role."}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />}
          >
            Refresh
          </Button>
          {isSuperAdmin && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsCreateOpen(true)}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Add Asset
            </Button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search asset title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-10 pr-4 text-sm bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="h-10 px-3 text-sm bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
        >
          <option value="all">All Types</option>
          {ASSET_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Asset</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Language</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableLoadingState colSpan={5} />
          ) : assets.length === 0 ? (
            <TableEmptyState
              colSpan={5}
              title="No marketing assets found"
              description="Super Admin can publish posters, brochures, and templates here."
            />
          ) : (
            assets.map((asset) => (
              <TableRow key={asset.id}>
                <TableCell>
                  <div className="flex items-start gap-2">
                    <Megaphone className="w-4 h-4 text-violet-600 mt-0.5 shrink-0" />
                    <div>
                      <div className="font-semibold text-slate-900">{asset.title}</div>
                      <a
                        href={asset.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-blue-600 hover:underline inline-flex items-center gap-1 mt-0.5"
                      >
                        Open file
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-xs font-medium uppercase text-slate-700">
                    {asset.type.replace("_", " ")}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-xs text-slate-600">{asset.language}</span>
                </TableCell>
                <TableCell>
                  {asset.status === "active" ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3" />
                      Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-50 text-slate-600 border border-slate-200">
                      <Archive className="w-3 h-3" />
                      {asset.status}
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {isSuperAdmin && asset.status !== "archived" ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => archiveMutation.mutate(asset.id)}
                      disabled={archiveMutation.isPending}
                    >
                      Archive
                    </Button>
                  ) : (
                    <span className="text-[11px] text-slate-400">View only</span>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Add Marketing Asset"
        description="Publish a creative URL for partner download (no file upload in MVP)."
        size="md"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button variant="outline" size="sm" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                if (!title.trim() || !fileUrl.trim()) {
                  addToast({
                    type: "error",
                    title: "Missing Fields",
                    message: "Title and a valid file URL are required.",
                  });
                  return;
                }
                createMutation.mutate();
              }}
              isLoading={createMutation.isPending}
            >
              Publish Asset
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <Input
            label="Title *"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. September Intake Poster"
            required
            autoFocus
          />
          <Select
            label="Asset Type *"
            value={type}
            onChange={(e) => setType(e.target.value)}
            options={ASSET_TYPE_OPTIONS}
          />
          <Input
            label="File URL *"
            type="url"
            value={fileUrl}
            onChange={(e) => setFileUrl(e.target.value)}
            placeholder="https://cdn.example.com/poster.pdf"
            required
          />
          <Input
            label="Language"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            placeholder="en"
          />
          <Select
            label="Linked Course"
            value={courseId}
            onChange={(e) => setCourseId(e.target.value)}
            options={courseOptions}
          />
        </div>
      </Modal>
    </div>
  );
}
