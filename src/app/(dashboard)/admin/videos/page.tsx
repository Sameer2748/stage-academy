"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Plus,
  Upload,
  Trash2,
  Edit3,
  ExternalLink,
  Play,
  FolderOpen,
  GripVertical,
  Video,
} from "lucide-react";

interface VideoItem {
  id: string;
  title: string;
  driveFileId: string;
  description: string | null;
  duration: number | null;
  sortOrder: number;
  weekReference: string | null;
  moduleId: string;
}

interface ModuleItem {
  id: string;
  moduleNumber: number;
  title: string;
  phase: string;
  videos: VideoItem[];
}

export default function AdminVideosPage() {
  const [modules, setModules] = useState<ModuleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [bulkImportOpen, setBulkImportOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewFileId, setPreviewFileId] = useState("");

  // Form state
  const [formModuleId, setFormModuleId] = useState("");
  const [formTitle, setFormTitle] = useState("");
  const [formDriveFileId, setFormDriveFileId] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formSortOrder, setFormSortOrder] = useState(0);
  const [formWeekRef, setFormWeekRef] = useState("");
  const [formDuration, setFormDuration] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [bulkFolderUrl, setBulkFolderUrl] = useState("");
  const [bulkModuleId, setBulkModuleId] = useState("");
  const [importing, setImporting] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch("/api/library/modules");
      const data = await res.json();
      setModules(data.modules || []);
    } catch {
      // handle error
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormTitle("");
    setFormDriveFileId("");
    setFormDescription("");
    setFormSortOrder(0);
    setFormWeekRef("");
    setFormDuration("");
    setFormModuleId("");
    setEditId(null);
  };

  const openAdd = () => {
    resetForm();
    setAddDialogOpen(true);
  };

  const openEdit = (video: VideoItem) => {
    setEditId(video.id);
    setFormTitle(video.title);
    setFormDriveFileId(video.driveFileId);
    setFormDescription(video.description || "");
    setFormSortOrder(video.sortOrder);
    setFormWeekRef(video.weekReference || "");
    setFormDuration(video.duration ? `${Math.floor(video.duration / 60)}:${(video.duration % 60).toString().padStart(2, "0")}` : "");
    setFormModuleId(video.moduleId);
    setEditDialogOpen(true);
  };

  const parseDuration = (str: string): number | null => {
    const parts = str.split(":");
    if (parts.length === 2) {
      return parseInt(parts[0]) * 60 + parseInt(parts[1]);
    }
    return null;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const body = {
        moduleId: formModuleId,
        title: formTitle,
        driveFileId: formDriveFileId,
        description: formDescription || null,
        sortOrder: formSortOrder,
        weekReference: formWeekRef || null,
        duration: formDuration ? parseDuration(formDuration) : null,
      };

      if (editId) {
        await fetch(`/api/admin/videos/${editId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        setEditDialogOpen(false);
      } else {
        await fetch("/api/admin/videos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        setAddDialogOpen(false);
      }
      resetForm();
      await fetchData();
    } catch {
      // handle error
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (videoId: string) => {
    if (!confirm("Delete this video?")) return;
    try {
      await fetch(`/api/admin/videos/${videoId}`, { method: "DELETE" });
      await fetchData();
    } catch {
      // handle error
    }
  };

  const handleBulkImport = async () => {
    setImporting(true);
    try {
      await fetch("/api/admin/videos/bulk-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          folderUrl: bulkFolderUrl,
          moduleId: bulkModuleId,
        }),
      });
      setBulkImportOpen(false);
      setBulkFolderUrl("");
      setBulkModuleId("");
      await fetchData();
    } catch {
      // handle error
    } finally {
      setImporting(false);
    }
  };

  const testEmbed = (fileId: string) => {
    setPreviewFileId(fileId);
    setPreviewOpen(true);
  };

  const totalVideos = modules.reduce((sum, m) => sum + m.videos.length, 0);

  const formContent = (
    <div className="space-y-4">
      <div>
        <label className="text-xs text-zinc-400 mb-1 block">Module</label>
        <Select value={formModuleId} onValueChange={setFormModuleId}>
          <SelectTrigger className="bg-[#0a0a0a] border-[#2a2a2a]">
            <SelectValue placeholder="Select module" />
          </SelectTrigger>
          <SelectContent>
            {modules.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <label className="text-xs text-zinc-400 mb-1 block">Title</label>
        <Input
          value={formTitle}
          onChange={(e) => setFormTitle(e.target.value)}
          className="bg-[#0a0a0a] border-[#2a2a2a]"
        />
      </div>
      <div>
        <label className="text-xs text-zinc-400 mb-1 block">
          Google Drive File ID
        </label>
        <div className="flex gap-2">
          <Input
            value={formDriveFileId}
            onChange={(e) => setFormDriveFileId(e.target.value)}
            placeholder="Paste from share link"
            className="bg-[#0a0a0a] border-[#2a2a2a] flex-1"
          />
          <Button
            variant="outline"
            size="sm"
            className="border-[#2a2a2a]"
            onClick={() => formDriveFileId && testEmbed(formDriveFileId)}
            disabled={!formDriveFileId}
          >
            <Play className="w-3 h-3" />
          </Button>
        </div>
      </div>
      <div>
        <label className="text-xs text-zinc-400 mb-1 block">Description</label>
        <Textarea
          value={formDescription}
          onChange={(e) => setFormDescription(e.target.value)}
          className="bg-[#0a0a0a] border-[#2a2a2a]"
          rows={2}
        />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-xs text-zinc-400 mb-1 block">Sort Order</label>
          <Input
            type="number"
            value={formSortOrder}
            onChange={(e) => setFormSortOrder(Number(e.target.value))}
            className="bg-[#0a0a0a] border-[#2a2a2a]"
          />
        </div>
        <div>
          <label className="text-xs text-zinc-400 mb-1 block">
            Duration (m:ss)
          </label>
          <Input
            value={formDuration}
            onChange={(e) => setFormDuration(e.target.value)}
            placeholder="3:45"
            className="bg-[#0a0a0a] border-[#2a2a2a]"
          />
        </div>
        <div>
          <label className="text-xs text-zinc-400 mb-1 block">
            Week Reference
          </label>
          <Input
            value={formWeekRef}
            onChange={(e) => setFormWeekRef(e.target.value)}
            placeholder="Week 1-3"
            className="bg-[#0a0a0a] border-[#2a2a2a]"
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Video Management</h2>
          <p className="text-sm text-zinc-500 mt-1">
            {totalVideos} videos across {modules.length} modules
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="border-[#2a2a2a] gap-2"
            onClick={() => setBulkImportOpen(true)}
          >
            <Upload className="w-4 h-4" /> Bulk Import
          </Button>
          <Button
            className="bg-indigo-600 hover:bg-indigo-700 gap-2"
            onClick={openAdd}
          >
            <Plus className="w-4 h-4" /> Add Video
          </Button>
        </div>
      </div>

      {/* Modules & Videos */}
      <div className="space-y-4">
        {modules.map((mod) => (
          <Card key={mod.id} className="bg-[#111111] border-[#2a2a2a] overflow-hidden">
            <div className="p-4 border-b border-[#2a2a2a] flex items-center gap-3">
              <Badge variant="secondary">{mod.phase}</Badge>
              <span className="font-semibold text-sm">{mod.title}</span>
              <span className="text-xs text-zinc-500">
                {mod.videos.length} videos
              </span>
            </div>
            {mod.videos.length === 0 ? (
              <div className="p-4 text-center text-sm text-zinc-600">
                No videos in this module
              </div>
            ) : (
              <div className="divide-y divide-[#1a1a1a]">
                {mod.videos.map((video) => (
                  <div
                    key={video.id}
                    className="flex items-center gap-3 p-3 hover:bg-[#1a1a1a] transition-colors"
                  >
                    <GripVertical className="w-4 h-4 text-zinc-700 shrink-0" />
                    <Video className="w-4 h-4 text-zinc-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-zinc-200 truncate">
                        {video.title}
                      </p>
                      <p className="text-[10px] text-zinc-600 font-mono">
                        {video.driveFileId}
                      </p>
                    </div>
                    {video.duration && (
                      <span className="text-xs text-zinc-500">
                        {Math.floor(video.duration / 60)}:
                        {(video.duration % 60).toString().padStart(2, "0")}
                      </span>
                    )}
                    <span className="text-xs text-zinc-600">
                      #{video.sortOrder}
                    </span>
                    <div className="flex gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => testEmbed(video.driveFileId)}
                      >
                        <Play className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => openEdit(video)}
                      >
                        <Edit3 className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-red-400"
                        onClick={() => handleDelete(video.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* Add Video Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="bg-[#111111] border-[#2a2a2a] max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Video</DialogTitle>
          </DialogHeader>
          {formContent}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAddDialogOpen(false)}
              className="border-[#2a2a2a]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !formTitle || !formDriveFileId || !formModuleId}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {saving ? "Saving..." : "Add Video"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Video Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="bg-[#111111] border-[#2a2a2a] max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Video</DialogTitle>
          </DialogHeader>
          {formContent}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              className="border-[#2a2a2a]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Import Dialog */}
      <Dialog open={bulkImportOpen} onOpenChange={setBulkImportOpen}>
        <DialogContent className="bg-[#111111] border-[#2a2a2a]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderOpen className="w-5 h-5" /> Bulk Import from Drive
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">
                Target Module
              </label>
              <Select value={bulkModuleId} onValueChange={setBulkModuleId}>
                <SelectTrigger className="bg-[#0a0a0a] border-[#2a2a2a]">
                  <SelectValue placeholder="Select module" />
                </SelectTrigger>
                <SelectContent>
                  {modules.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">
                Google Drive Folder URL
              </label>
              <Input
                value={bulkFolderUrl}
                onChange={(e) => setBulkFolderUrl(e.target.value)}
                placeholder="https://drive.google.com/drive/folders/..."
                className="bg-[#0a0a0a] border-[#2a2a2a]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBulkImportOpen(false)}
              className="border-[#2a2a2a]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleBulkImport}
              disabled={importing || !bulkFolderUrl || !bulkModuleId}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {importing ? "Importing..." : "Import"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="bg-[#111111] border-[#2a2a2a] max-w-3xl">
          <DialogHeader>
            <DialogTitle>Video Preview</DialogTitle>
          </DialogHeader>
          <div className="aspect-video bg-black rounded-lg overflow-hidden">
            {previewFileId && (
              <iframe
                src={`https://drive.google.com/file/d/${previewFileId}/preview`}
                width="100%"
                height="100%"
                allow="autoplay; encrypted-media"
                allowFullScreen
              />
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPreviewOpen(false)}
              className="border-[#2a2a2a]"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
