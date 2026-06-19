# Radix UI Select Custom Markup and Triggers

## Problem
When custom markup (such as a flex container with a label and a description) is passed directly as children to shadcn/ui or Radix UI `SelectItem`, the entire markup is wrapped by default in `SelectPrimitive.ItemText`. When the item is selected, Radix UI's `SelectValue` inside `SelectTrigger` attempts to render the entire `ItemText` content. This causes the trigger button to display complex multiline layouts, which overflows or gets squished in fixed-height inputs (e.g. `h-9`).

## Solution & Shadcn Upgrade Safety
Modifying the raw shadcn component file (like `@/components/ui/select.tsx`) exposes your codebase to losing changes if you later update or reinstall that shadcn component via the CLI (e.g., `npx shadcn add select --overwrite`).

To prevent this:
1. Keep the base shadcn component (`select.tsx`) untouched and in its original state.
2. Define a custom styled wrapper (e.g. `SelectItemWithDescription`) either locally within the page/panel module or in a custom, non-shadcn UI directory.
3. In the custom wrapper, import `SelectPrimitive` from `@radix-ui/react-select` directly and lay out the elements so that only the label is inside `SelectPrimitive.ItemText`, while the description is outside.

```tsx
// Inside ModelDefaultsPanel.tsx or a custom select module
import * as SelectPrimitive from '@radix-ui/react-select'

const SelectItemWithDescription = forwardRef<
  ElementRef<typeof SelectPrimitive.Item>,
  ComponentPropsWithoutRef<typeof SelectPrimitive.Item> & {
    description?: ReactNode
  }
>(({ className, children, description, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    )}
    {...props}
  >
    <span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className="h-4 w-4" />
      </SelectPrimitive.ItemIndicator>
    </span>
    <div className="flex flex-col">
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
      {description && (
        <span className="text-xs text-muted-foreground font-normal mt-0.5">{description}</span>
      )}
    </div>
  </SelectPrimitive.Item>
))
```
This ensures that the closed select trigger only extracts the clean text from `ItemText` to show in the input, while the dropdown menu still displays the full label and description. It is completely safe from shadcn component overwrites.
