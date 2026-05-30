"use client";

import { useState } from "react";
import { Loader2, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useCategories,
  useCreateCategory,
  useDeleteCategory,
  useUpdateCategory,
} from "@/hooks/useCategories";
import type { Category } from "@/types/category";

function CategoryRow({ category }: { category: Category }) {
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(category.label);
  const [icon, setIcon] = useState(category.icon);
  const [color, setColor] = useState(category.color);

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-800 bg-slate-950/60 px-4 py-3">
      <span
        className="size-3 shrink-0 rounded-full"
        style={{ backgroundColor: category.color }}
      />
      <span className="text-lg">{category.icon}</span>
      {editing ? (
        <div className="flex flex-1 flex-wrap items-end gap-2">
          <div className="space-y-1">
            <Label htmlFor={`label-${category.id}`} className="text-xs">
              Label
            </Label>
            <Input
              id={`label-${category.id}`}
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              className="h-8 w-40"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`icon-${category.id}`} className="text-xs">
              Icon
            </Label>
            <Input
              id={`icon-${category.id}`}
              value={icon}
              onChange={(event) => setIcon(event.target.value)}
              className="h-8 w-16"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`color-${category.id}`} className="text-xs">
              Color
            </Label>
            <Input
              id={`color-${category.id}`}
              type="color"
              value={color}
              onChange={(event) => setColor(event.target.value)}
              className="h-8 w-14 p-1"
            />
          </div>
          <Button
            type="button"
            size="sm"
            disabled={updateCategory.isPending}
            onClick={() => {
              updateCategory.mutate(
                { id: category.id, label, icon, color },
                { onSuccess: () => setEditing(false) }
              );
            }}
          >
            Save
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>
            Cancel
          </Button>
        </div>
      ) : (
        <>
          <div className="flex-1">
            <p className="font-medium">{category.label}</p>
            <p className="text-xs text-muted-foreground">{category.id}</p>
          </div>
          {category.is_system ? (
            <Badge variant="secondary">System</Badge>
          ) : (
            <div className="flex gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => setEditing(true)}>
                Edit
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={deleteCategory.isPending}
                onClick={() => deleteCategory.mutate(category.id)}
              >
                {deleteCategory.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Trash2 className="size-4" />
                )}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export function CategoryList() {
  const { data: categories, isLoading, error } = useCategories();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-negative">Failed to load categories.</p>;
  }

  return (
    <div className="space-y-2">
      {(categories ?? []).map((category) => (
        <CategoryRow key={category.id} category={category} />
      ))}
    </div>
  );
}

export function CategoryForm() {
  const createCategory = useCreateCategory();
  const [label, setLabel] = useState("");
  const [icon, setIcon] = useState("📦");

  return (
    <form
      className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-800 bg-slate-900/50 p-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (!label.trim()) {
          return;
        }

        createCategory.mutate(
          { label: label.trim(), icon: icon.trim() || "📦" },
          {
            onSuccess: () => {
              setLabel("");
              setIcon("📦");
            },
          }
        );
      }}
    >
      <div className="space-y-1">
        <Label htmlFor="new-category-label">New category</Label>
        <Input
          id="new-category-label"
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          placeholder="e.g. Pets"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="new-category-icon">Icon</Label>
        <Input
          id="new-category-icon"
          value={icon}
          onChange={(event) => setIcon(event.target.value)}
          className="w-16"
        />
      </div>
      <Button type="submit" disabled={createCategory.isPending || !label.trim()}>
        {createCategory.isPending ? <Loader2 className="size-4 animate-spin" /> : "Add"}
      </Button>
      {createCategory.error ? (
        <p className="w-full text-sm text-negative">{createCategory.error.message}</p>
      ) : null}
    </form>
  );
}
