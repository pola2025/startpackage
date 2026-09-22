import { auth } from "@/auth";
import { redirect } from "next/navigation";
import EducationAccessClient from "./education-access-client";
export default async function EducationAccessPage(){const session=await auth();if(!session||!["super","designer","operator"].includes(String((session.user as {role?:string}).role)))redirect("/admin/login");return <EducationAccessClient/>}
