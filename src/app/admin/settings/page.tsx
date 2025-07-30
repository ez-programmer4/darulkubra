"use client";

import { useRouter } from "next/navigation";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowRight, FileText, UserCog, Wallet } from "lucide-react";

interface SettingCardProps {
  title: string;
  description: string;
  href: string;
  icon: React.ElementType;
}

function SettingCard({
  title,
  description,
  href,
  icon: Icon,
}: SettingCardProps) {
  const router = useRouter();

  return (
    <Card
      className="cursor-pointer hover:border-blue-100 transition-colors group"
      onClick={() => router.push(href)}
    >
      <CardHeader className="flex flex-row items-start gap-4 space-y-0">
        <div className="bg-blue-600/10 p-3 rounded-md">
          <Icon className="h-6 w-6 text-blue-600" />
        </div>
        <div className="flex-1 space-y-1">
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
      </CardHeader>
    </Card>
  );
}

export default function AdminSettingsPage() {
  const settings = [
    {
      title: "General Settings",
      description: "Manage system-wide key-value configurations.",
      href: "/admin/settings/general",
      icon: UserCog,
    },
    // Add other settings pages here as they are created
    // {
    //   title: "Payment Settings",
    //   description: "Configure payment gateways and fee structures.",
    //   href: "/admin/settings/payments",
    //   icon: Wallet,
    // },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col space-y-1">
        <h1 className="text-3xl font-bold tracking-tight text-blue-900">
          System Settings
        </h1>
        <p className="text-blue-500">
          Manage and configure all aspects of the DarulKubra system.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {settings.map((setting) => (
          <SettingCard key={setting.title} {...setting} />
        ))}
      </div>
    </div>
  );
}
