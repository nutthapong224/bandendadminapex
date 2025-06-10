const multer = require('multer');
const path = require('path');
const fs = require("fs");
const pool = require('../config/db'); // your MySQL pool connection
const uploadsDir = path.join(__dirname, "../uploads");

// Create the uploads directory if it doesn't exist
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer storage to save files with unique names
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir); // Save files to the 'uploads' directory
  },
  filename: (req, file, cb) => {
    // Generate a unique filename using timestamp and random string, retaining the original file extension
    const uniqueSuffix = Date.now() + '-' + Math.random().toString(36).substring(2, 15);
    const fileExtension = path.extname(file.originalname); // Get the file's extension
    const filename = `${uniqueSuffix}${fileExtension}`;
    cb(null, filename); // Set the unique filename
  },
});

// File filter to allow only specific file types (JPEG, PNG, PDF)
const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/png", "application/pdf"];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type. Only JPEG, PNG, and PDF are allowed."), false);
  }
};

// Multer setup for handling file uploads
exports.upload = multer({ storage, fileFilter });

exports.addEmployee = async (req, res) => {
  const {
    first_name,
    last_name,
    nickname,
    mobile_no,
    birth_date,
    gender,
    nationality,
    religion,
    marital_status,
    email_person,
    line_id,
    id_card_number,
    id_card_issued_date,
    id_card_expiry_date,
    position,
    salary,
    start_date,
    probation_end_date,
    status_employee = 'ACTIVE',
    bank_name,
    account_number,
    account_name,
    father_name,
    father_birthdate,
    father_occupation,
    mother_name,
    mother_birthdate,
    mother_occupation,
    spouse_name,
    spouse_birthdate,
    spouse_occupation,
    total_siblings,
    order_of_siblings,
    total_children,
    total_boys,
    total_girls,
    language_speaking,
    language_reading,
    language_writing,
    criminal_record,
    upcountry_areas,
    create_name = null,
    modify_name = null,
    // Address card fields
    address_house_address,
    address_house_sub_district,
    address_house_district,
    address_house_province,
    address_house_postal_code,
    // Address house fields (ใหม่)
    address_card_address,
    address_card_sub_district,
    address_card_district,
    address_card_province,
    address_card_postal_code,
    employee_type_id,
    // Contact person 1
    contact_person1_name,
    contact_person1_relationship,
    contact_person1_mobile,
    contact_person1_address,
    // Contact person 2
    contact_person2_name,
    contact_person2_relationship,
    contact_person2_mobile,
    contact_person2_address,
    // Children data - array of objects with child_name and child_birthdate
    children_data = [],
    // Siblings data - array of objects with siblings info
    siblings_data = [],
    // Education history data - array of objects with education info
    education_history_data = [],
    // Work experience data - array of objects with work experience info
    work_experience_data = []
  } = req.body;

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    let finalAttachmentId = null;

    // Step 1: Insert address_card
    const [insertAddressCard] = await connection.query(
      `INSERT INTO address_card (address, sub_district, district, province, postal_code)
       VALUES (?, ?, ?, ?, ?)`,
      [address_card_address, address_card_sub_district, address_card_district, address_card_province, address_card_postal_code]
    );
    const address_card_id = insertAddressCard.insertId;

    // Step 2: Insert address_house (ใหม่)
    const [insertAddressHouse] = await connection.query(
      `INSERT INTO address_house (address, sub_district, district, province, postal_code)
       VALUES (?, ?, ?, ?, ?)`,
      [address_house_address, address_house_sub_district, address_house_district, address_house_province, address_house_postal_code]
    );
    const address_house_id = insertAddressHouse.insertId;

    // Step 3: Insert main attachment
    const [insertAttachment] = await connection.query(
      `INSERT INTO attachment (reference_type, create_name, modify_name, create_date, modify_date)
       VALUES (?, ?, ?, NOW(), NOW())`,
      ['employee', create_name, modify_name]
    );
    finalAttachmentId = insertAttachment.insertId;

    const uploadedFiles = [];
    const allAttachmentIds = [finalAttachmentId];

    // Step 4: Handle uploaded files
    if (req.files && req.files['file_name'] && req.files['file_name'].length > 0) {
      for (let i = 0; i < req.files['file_name'].length; i++) {
        const file = req.files['file_name'][i];
        const fileName = file.filename;
        const filePath = `/uploads/${fileName}`;

        if (i === 0) {
          await connection.query(
            `UPDATE attachment SET file_name = ?, file_path = ?, modify_date = NOW() WHERE attachment_id = ?`,
            [fileName, filePath, finalAttachmentId]
          );

          uploadedFiles.push({
            attachment_id: finalAttachmentId,
            file_name: fileName,
            file_path: filePath
          });
        } else {
          const [newAttachment] = await connection.query(
            `INSERT INTO attachment (file_name, file_path, reference_type, create_name, modify_name, create_date, modify_date)
             VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
            [fileName, filePath, 'employee', create_name, modify_name]
          );
          allAttachmentIds.push(newAttachment.insertId);
          uploadedFiles.push({
            attachment_id: newAttachment.insertId,
            file_name: fileName,
            file_path: filePath
          });
        }
      }
    }

    // Step 5: Insert employee and link with address_card_id, address_house_id, attachment_id, and employee_type_id
    const [employeeInsert] = await connection.query(
      `INSERT INTO employee (
        first_name, last_name, nickname, pic_path, mobile_no, birth_date, gender,
        nationality, religion, marital_status, email_person, line_id,
        id_card_number, id_card_issued_date, id_card_expiry_date,
        position, salary, start_date, probation_end_date, status_employee,
        bank_name, account_number, account_name,
        father_name, father_birthdate, father_occupation,
        mother_name, mother_birthdate, mother_occupation,
        spouse_name, spouse_birthdate, spouse_occupation,
        total_siblings, order_of_siblings, total_children, total_boys, total_girls,
        language_speaking, language_reading, language_writing,
        criminal_record, upcountry_areas, attachment_id, address_card_id, address_house_id, employee_type_id
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      )`,
      [
        first_name, last_name, nickname,
        uploadedFiles[0]?.file_path || null,
        mobile_no, birth_date, gender,
        nationality, religion, marital_status, email_person, line_id,
        id_card_number, id_card_issued_date, id_card_expiry_date,
        position, salary, start_date, probation_end_date, status_employee,
        bank_name, account_number, account_name,
        father_name, father_birthdate, father_occupation,
        mother_name, mother_birthdate, mother_occupation,
        spouse_name, spouse_birthdate, spouse_occupation,
        total_siblings, order_of_siblings, total_children, total_boys, total_girls,
        language_speaking, language_reading, language_writing,
        criminal_record, upcountry_areas, finalAttachmentId, address_card_id, address_house_id, employee_type_id
      ]
    );

    const insertedEmployeeId = employeeInsert.insertId;

    // Step 6.1: Insert contact_person1
    const [insertContactPerson1] = await connection.query(
      `INSERT INTO contact_person1 (name, relationship, mobile, address)
       VALUES (?, ?, ?, ?)`,
      [contact_person1_name, contact_person1_relationship, contact_person1_mobile, contact_person1_address]
    );
    const [insertContactPerson2] = await connection.query(
      `INSERT INTO contact_person2 (name, relationship, mobile, address)
       VALUES (?, ?, ?, ?)`,
      [contact_person2_name, contact_person2_relationship, contact_person2_mobile, contact_person2_address]
    );
    const contact_person1_id = insertContactPerson1.insertId;
    const contact_person2_id = insertContactPerson2.insertId;

    // Step 6.2: Update employee with contact_person1_id and contact_person2_id
    await connection.query(
      `UPDATE employee SET contact_person1_id = ?, contact_person2_id = ? WHERE employee_id = ?`,
      [contact_person1_id, contact_person2_id, insertedEmployeeId]
    );

    // Step 6.3: Insert children data
    const insertedChildrenIds = [];
    if (children_data && Array.isArray(children_data) && children_data.length > 0) {
      for (const child of children_data) {
        const { child_name, child_birthdate } = child;
        if (child_name && child_birthdate) {
          const [insertChild] = await connection.query(
            `INSERT INTO children (child_name, child_birthdate, employee_id)
             VALUES (?, ?, ?)`,
            [child_name, child_birthdate, insertedEmployeeId]
          );
          insertedChildrenIds.push({
            child_id: insertChild.insertId,
            child_name: child_name,
            child_birthdate: child_birthdate
          });
        }
      }
    }

    // Step 6.4: Insert siblings data
    const insertedSiblingsIds = [];
    if (siblings_data && Array.isArray(siblings_data) && siblings_data.length > 0) {
      for (const sibling of siblings_data) {
        const { siblings_name, siblings_birthdate, siblings_mobile, siblings_occupation } = sibling;
        if (siblings_name) {
          const [insertSibling] = await connection.query(
            `INSERT INTO siblings (siblings_name, siblings_birthdate, siblings_mobile, siblings_occupation, employee_id)
             VALUES (?, ?, ?, ?, ?)`,
            [siblings_name, siblings_birthdate, siblings_mobile, siblings_occupation, insertedEmployeeId]
          );
          insertedSiblingsIds.push({
            siblings_id: insertSibling.insertId,
            siblings_name: siblings_name,
            siblings_birthdate: siblings_birthdate,
            siblings_mobile: siblings_mobile,
            siblings_occupation: siblings_occupation
          });
        }
      }
    }

    // Step 6.5: Insert education history data
    const insertedEducationIds = [];
    if (education_history_data && Array.isArray(education_history_data) && education_history_data.length > 0) {
      for (const education of education_history_data) {
        const { level, field, institution, year } = education;
        if (level) {
          const [insertEducation] = await connection.query(
            `INSERT INTO education_history (level, field, institution, year, employee_id)
             VALUES (?, ?, ?, ?, ?)`,
            [level, field, institution, year, insertedEmployeeId]
          );
          insertedEducationIds.push({
            education_id: insertEducation.insertId,
            level: level,
            field: field,
            institution: institution,
            year: year
          });
        }
      }
    }

    // Step 6.6: Insert work experience data
    const insertedWorkExperienceIds = [];
    if (work_experience_data && Array.isArray(work_experience_data) && work_experience_data.length > 0) {
      for (const workExp of work_experience_data) {
        const { company, position, from_date, to_date, salary, detail } = workExp;
        if (company) {
          const [insertWorkExp] = await connection.query(
            `INSERT INTO work_experience (company, position, from_date, to_date, salary, detail, employee_id)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [company, position, from_date, to_date, salary, detail, insertedEmployeeId]
          );
          insertedWorkExperienceIds.push({
            work_experience_id: insertWorkExp.insertId,
            company: company,
            position: position,
            from_date: from_date,
            to_date: to_date,
            salary: salary,
            detail: detail
          });
        }
      }
    }

    // Step 7: Update reference_id in attachments
    for (const attachmentId of allAttachmentIds) {
      await connection.query(
        `UPDATE attachment SET reference_id = ? WHERE attachment_id = ?`,
        [insertedEmployeeId, attachmentId]
      );
    }

    // Step 8: Update employee_type name using employee name
    const [employeeTypeRows] = await connection.query(
      `SELECT name FROM employee_type WHERE employee_type_id = ?`,
      [employee_type_id]
    );

    if (employeeTypeRows.length > 0) {
      await connection.query(
        `UPDATE employee_type SET name = ? WHERE employee_type_id = ?`,
        [`${first_name} ${last_name}`, employee_type_id]
      );
    }

    await connection.commit();

    res.status(200).json({
      message: 'เพิ่มข้อมูลพนักงานสำเร็จ',
      insertedId: insertedEmployeeId,
      address_card_id: address_card_id,
      address_house_id: address_house_id,
      contact_person1_id: contact_person1_id,
      contact_person2_id: contact_person2_id,
      children_ids: insertedChildrenIds,
      siblings_ids: insertedSiblingsIds,
      education_ids: insertedEducationIds,
      work_experience_ids: insertedWorkExperienceIds,
      main_attachment_id: finalAttachmentId,
      all_attachment_ids: allAttachmentIds,
      uploaded_files: uploadedFiles
    });

  } catch (err) {
    await connection.rollback();
    console.error('Database error:', err);
    res.status(500).json({
      error: 'เกิดข้อผิดพลาดในการเพิ่มข้อมูลพนักงาน',
      detail: err.message
    });
  } finally {
    connection.release();
  }
};