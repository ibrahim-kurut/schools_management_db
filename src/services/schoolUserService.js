const prisma = require("../utils/prisma");
const { hashPassword } = require("../utils/auth");
const supabase = require("../config/supabaseClient");
const BUCKET = process.env.SUPABASE_BUCKET || 'assets';

/**
 * @description Add a new member to a school
 * @route POST /api/school-user
 * @method POST
 * @access private (school owner)
 */
exports.addMemberService = async (requesterId, memberData, file, requesterRole) => {
    // 1. Get School for the Requester (Owner) & Include Plan
    const school = await prisma.school.findUnique({
        where: { ownerId: requesterId },
        include: {
            subscription: {
                include: { plan: true }
            },
            classes: true
        }
    });

    if (!school) {
        throw new Error("School not found for this user");
    }

    // 2. Check Subscription Status
    if (school.subscription?.status !== "ACTIVE") {
        throw new Error("School plan is not active");
    }

    const memberRole = memberData.role;

    // 2.5 Role Restriction: Assistant can only create TEACHER or STUDENT
    if (requesterRole === 'ASSISTANT' && !['TEACHER', 'STUDENT'].includes(memberRole)) {
        throw new Error("Assistants can only add Teachers or Students");
    }

    let targetClassId = null;

    // 3. Validate Class - Required for STUDENT, Optional for TEACHER
    if (memberRole === "STUDENT" || memberRole === "TEACHER") {
        if (memberRole === "STUDENT" && !memberData.className) {
            throw new Error("Class name is required for students");
        }

        if (memberData.className) {
            const targetClass = school.classes.find((c) => c.name === memberData.className);
            if (!targetClass) {
                throw new Error("Class not found in this school");
            }
            targetClassId = targetClass.id;
        }
    }

    // 4. Check Plan Limits
    if (memberRole === "STUDENT") {
        const currentStudentsCount = await prisma.user.count({
            where: { schoolId: school.id, role: "STUDENT" }
        });
        if (currentStudentsCount >= school.subscription.plan.maxStudents) {
            throw new Error("Plan limit reached for Students. Upgrade your plan.");
        }
    } else if (memberRole === "TEACHER" || memberRole === "ASSISTANT" || memberRole === "ACCOUNTANT") {
        const currentTeachersCount = await prisma.user.count({
            where: { schoolId: school.id, role: { in: ["TEACHER", "ASSISTANT", "ACCOUNTANT"] } }
        });
        if (currentTeachersCount >= school.subscription.plan.maxTeachers) {
            throw new Error("Plan limit reached for Teachers. Upgrade your plan.");
        }
    }

    // 5. Check if user email already exists
    const existingUser = await prisma.user.findUnique({
        where: { email: memberData.email }
    });

    if (existingUser) {
        throw new Error("User with this email already exists");
    }

    // 6. Hash Password & Create User
    const hashedPassword = await hashPassword(memberData.password);

    const newUser = await prisma.user.create({
        data: {
            firstName: memberData.firstName,
            lastName: memberData.lastName,
            email: memberData.email,
            password: hashedPassword,
            phone: memberData.phone,
            gender: memberData.gender,
            birthDate: new Date(memberData.birthDate),
            role: memberRole,
            schoolId: school.id,
            // classId is set for STUDENT or TEACHER if provided
            ...((memberRole === "STUDENT" || memberRole === "TEACHER") && {
                classId: targetClassId,
                ...(memberRole === "STUDENT" && {
                    studentProfile: {
                        create: {
                            // Only SCHOOL_ADMIN or ACCOUNTANT can set discount
                            discountAmount: (requesterRole === 'SCHOOL_ADMIN' || requesterRole === 'ACCOUNTANT') 
                                ? (memberData.discountAmount ? Number(memberData.discountAmount) : 0) 
                                : 0,
                            discountNotes: (requesterRole === 'SCHOOL_ADMIN' || requesterRole === 'ACCOUNTANT')
                                ? (memberData.discountNotes || null)
                                : null
                        }
                    }
                })
            })
        },
        include: {
            ...((memberRole === "STUDENT" || memberRole === "TEACHER") && {
                class: true,
                ...(memberRole === "STUDENT" && {
                    studentProfile: true
                })
            })
        }
    });

    // 7. Handle Image Upload if provided
    if (file) {
        try {
            const extension = file.originalname.split('.').pop();
            const fileName = `users/${newUser.id}/${Date.now()}.${extension}`;

            const { error: uploadError } = await supabase.storage
                .from(BUCKET)
                .upload(fileName, file.buffer, {
                    contentType: file.mimetype,
                    upsert: true
                });

            if (!uploadError) {
                const { data: publicUrlData } = supabase.storage
                    .from(BUCKET)
                    .getPublicUrl(fileName);

                const imageUrl = publicUrlData.publicUrl;

                // Update user with image URL in Database
                await prisma.user.update({
                    where: { id: newUser.id },
                    data: { image: imageUrl }
                });

                // Update local object for response
                newUser.image = imageUrl;
            } else {
                console.error("Supabase upload error:", uploadError);
            }
        } catch (uploadErr) {
            console.error("Image upload failed during member creation:", uploadErr);
        }
    }


    // Return user without sensitive data
    const { password, ...userWithoutPassword } = newUser;
    return userWithoutPassword;
};

/**
 * @description  Get all members of a school
 * @route GET /api/school-user
 * @method GET
 * @access private (school owner)
 */

exports.getAllMembersService = async (requesterId, page, limit, searchWord, roleFilter) => {
    const skip = (page - 1) * limit;

    // 1. Get School Basic Info
    const school = await prisma.school.findUnique({
        where: { ownerId: requesterId },
        select: { id: true, name: true, slug: true, logo: true }
    });

    if (!school) {
        throw new Error("School not found for this user");
    }

    // 2. Build dynamic where clause
    const whereClause = {
        schoolId: school.id,
        isDeleted: false,
    };

    // Add search filter (OR logic: search in firstName OR lastName)
    if (searchWord && searchWord.trim() !== "") {
        whereClause.OR = [
            { firstName: { contains: searchWord, mode: 'insensitive' } },
            { lastName: { contains: searchWord, mode: 'insensitive' } }
        ];
    }

    // Add role filter only if provided
    if (roleFilter) {
        whereClause.role = roleFilter;
    }

    // 3. Get Total Count of Members (for Pagination)
    const totalMembers = await prisma.user.count({
        where: whereClause
    });

    // 4. Get Members for Current Page
    const members = await prisma.user.findMany({
        where: whereClause,
        skip: skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            gender: true,
            birthDate: true,
            role: true,
            schoolId: true,
            createdAt: true,
            studentProfile: {
                select: {
                    discountAmount: true,
                    discountNotes: true
                }
            },
            class: {
                select: {
                    id: true,
                    name: true
                }
            }
        }
    });

    return {
        school,
        members,
        totalMembers
    };
};


/**
 * @description  Get a member by ID
 * @route GET /api/school-user/:id
 * @method GET
 * @access private (school owner)
 */

exports.getMemberByIdService = async (ownerId, memberId) => {
    // 1. Get School for the Requester (Owner)
    const school = await prisma.school.findUnique({
        where: { ownerId: ownerId },
        select: { id: true }
    });

    if (!school) {
        throw new Error("School not found for this user");
    }

    // 2. Get Member by ID
    const member = await prisma.user.findUnique({
        where: { id: memberId },
        select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            gender: true,
            birthDate: true,
            role: true,
            schoolId: true,
            createdAt: true,
            class: {
                select: {
                    id: true,
                    name: true,
                    tuitionFee: true
                }
            },
            studentProfile: {
                select: {
                    discountAmount: true,
                    discountNotes: true
                }
            },
        }
    });
    if (!member || member.isDeleted) {
        throw new Error("Member not found");
    }

    // 3. Check if Member belongs to the School
    if (member.schoolId !== school.id) {
        throw new Error("Member does not belong to this school");
    }

    return member;

};

/**
 * @description Update a member
 * @route PUT /api/school-user/:id
 * @method PUT
 * @access private (school owner)
 */

exports.updateMemberByIdService = async (ownerId, memberId, reqData, file, requesterRole) => {
    // 1. Get School for the Requester (Owner)
    const school = await prisma.school.findUnique({
        where: { ownerId: ownerId },
        include: {
            members: { where: { id: memberId, isDeleted: false } }
        }
    });

    if (!school) {
        throw new Error("School not found for this user");
    }

    // 2. check if member exists in school
    const targetMember = school.members[0];
    if (!targetMember) {
        throw new Error("عضو غير موجود في هذه المدرسة");
    }

    // 3. RBAC Check: Assistant can only update TEACHER or STUDENT
    if (requesterRole === 'ASSISTANT' && !['TEACHER', 'STUDENT'].includes(targetMember.role)) {
        throw new Error("المعاون يمكنه تعديل بيانات المعلمين والطلاب فقط");
    }


    // 4. Specify allowed fields according to user role
    let dataToUpdate;

    if (requesterRole === "ASSISTANT") {
        // 5. Assistant: Can edit only limited fields
        const allowedFieldsForAssistant = ['firstName', 'lastName', 'phone', 'gender', 'birthDate'];

        dataToUpdate = {};
        for (const field of allowedFieldsForAssistant) {
            if (reqData[field] !== undefined) {
                dataToUpdate[field] = field === 'birthDate'
                    ? new Date(reqData[field])
                    : reqData[field];
            }
        }

        // Check for fields to update
        if (Object.keys(dataToUpdate).length === 0) {
            throw new Error("No valid fields to update for your role");
        }
    } else {
        // 6. Owner: Can edit all fields
        dataToUpdate = { ...reqData };

        // Handle className if sent
        if (dataToUpdate.className) {
            // Search for the class by name in the database (better performance than fetching all classes)
            const targetClass = await prisma.class.findFirst({
                where: {
                    schoolId: school.id,
                    name: dataToUpdate.className
                }
            });

            if (!targetClass) {
                throw new Error("Class not found in this school");
            }

            // Update classId and delete className
            dataToUpdate.classId = targetClass.id;
            delete dataToUpdate.className;
        }

        // Convert birthDate
        if (dataToUpdate.birthDate) {
            dataToUpdate.birthDate = new Date(dataToUpdate.birthDate);
        }

        // Hash password
        if (dataToUpdate.password) {
            dataToUpdate.password = await hashPassword(dataToUpdate.password);
        }
        // Handle image if sent
        if (file) {
            try {
                const fileName = `users/${memberId}/${Date.now()}`;
                const { data: uploadData, error: uploadErr } = await supabase.storage
                    .from(BUCKET)
                    .upload(fileName, file.buffer, {
                        contentType: file.mimetype,
                        cacheControl: '3600',
                        upsert: true
                    });

                if (uploadErr) throw uploadErr;

                const { data: { publicUrl } } = supabase.storage
                    .from(BUCKET)
                    .getPublicUrl(fileName);

                dataToUpdate.image = publicUrl;
            } catch (uploadErr) {
                console.error("Image upload failed during member update:", uploadErr);
            }
        }
    }


    // 7. Execute the update
    const updatedMember = await prisma.user.update({
        where: { id: memberId },
        data: dataToUpdate,
        select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            gender: true,
            birthDate: true,
            role: true,
            image: true,
            schoolId: true,
            createdAt: true,
            updatedAt: true,
            studentProfile: {
                select: {
                    discountAmount: true,
                    discountNotes: true
                }
            },
            class: {
                select: {
                    id: true,
                    name: true
                }
            }
        }
    });

    return updatedMember;
}


/**
 * @description Delete a member
 * @route DELETE /api/school-user/:id
 * @method DELETE
 * @access private (school owner)
 */

exports.deleteMemberByIdService = async (ownerId, memberId) => {
    // 1. Get School for the Requester (Owner)
    const school = await prisma.school.findUnique({
        where: { ownerId: ownerId },
        include: {
            members: { where: { id: memberId, isDeleted: false } }
        }
    });

    if (!school) {
        throw new Error("School not found for this user");
    }

    // 2. Check if member exists in school
    const targetMember = school.members[0];
    if (!targetMember) {
        throw new Error("Member not found in this school");
    }

    // 3. Delete the member (Soft Delete)
    const deletedMember = await prisma.user.update({
        where: { id: memberId },
        data: { isDeleted: true },
        select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            gender: true,
            birthDate: true,
            role: true,
            schoolId: true,
            createdAt: true,
            updatedAt: true,
            isDeleted: true
        }
    });

    return deletedMember;
}




//*! TODO
/**
 *? GET /profile - User profile (for logged-in user to see their own data)
 *? GET /school-user/:id/grades - Detailed grades for a member
 *? GET /school-user/:id/payments - Detailed payments for a member
 *? GET /school-user/:id/attendance - Attendance history for a member
 */
